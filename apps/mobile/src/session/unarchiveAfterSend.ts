import { isSharedTaskPeer } from '@cindy/device-link';
import { isHostManagedSession } from './hostManagedSession';
import {
  remoteSessionStore,
  resolveSessionWriteDevices,
  sessionMetaWriteGuard,
  sessionMetaWriteQueue,
  sessionPendingWrites,
} from './remoteSessionStore';
import { retryPatchWhileLatest } from './swipeRowRegistry';

/** 与设备链路 invoke 同形;preSend 是出网前的同步检查点,抛错即放弃这次发送。 */
export type SessionPatchInvoke = <T = unknown>(
  deviceId: string,
  channel: string,
  args?: unknown[],
  options?: { preSend?: () => void },
) => Promise<T>;

const ACTIVE_PATCH = { status: 'active' } as const;

/**
 * 与桌面一致:在已归档任务里发出的消息被电脑接收后,任务自动取消归档。
 *
 * 只能在电脑已确认收到消息之后调用——离线时消息先落进手机的待发队列,等重连送达
 * 才算发出,取消归档也跟着那一刻走,而不是在写入本地队列时一次性发起。
 * 菜单本来就不提供取消归档的任务(伙伴托管、分享来的任务、协同 Worker)不在这里改状态。
 *
 * 状态写入与菜单、首页的归档/删除共用 sessionMetaWriteGuard / sessionMetaWriteQueue:
 * 用户随后归档或删除时,以最新的用户意图为准,这笔旧写会让位,也不会用过期的行去回滚。
 * 传入的 invoke 只应绑定账号归属,不能绑定待发记录的生命周期(记录对账后会被清走)。
 * 取消归档失败不影响已送达的消息:任务保持已归档,不弹错误。
 */
export async function unarchiveSessionAfterSend(
  sessionId: string,
  deviceId: string,
  invoke: SessionPatchInvoke,
): Promise<void> {
  const row = remoteSessionStore.getSessions().find((item) => item.id === sessionId);
  if (row?.status !== 'archived' || row.orcaRole === 'worker') return;
  if (isHostManagedSession(row) || isSharedTaskPeer(deviceId)) return;
  const { rpcDeviceId, shardId } = resolveSessionWriteDevices(sessionId, row, deviceId)
    ?? { rpcDeviceId: deviceId, shardId: deviceId };
  const fields = Object.keys(ACTIVE_PATCH);
  const write = sessionMetaWriteGuard.begin(sessionId, fields);
  const releasePending = sessionPendingWrites.track(sessionId, fields);
  remoteSessionStore.applySessionPatch(shardId, sessionId, ACTIVE_PATCH);
  try {
    await sessionMetaWriteQueue.enqueue(sessionId, fields, () => retryPatchWhileLatest(
      write.isLatest,
      (assertStillLatest) => invoke(
        rpcDeviceId,
        'local-db:sessions:patch-meta',
        [sessionId, ACTIVE_PATCH],
        { preSend: assertStillLatest },
      ),
    ));
  } catch {
    // 只有仍是最新写才有资格回滚;被后续归档/删除取代时由那笔负责收敛。
    // 把状态改回 archived 会让行移出列表,与页面里的归档回滚一样整行插回原物理 shard;
    // 先释放在途登记,否则 upsert 会因 status 在途而被挡掉。
    if (write.isLatest()) {
      releasePending();
      const shardName = remoteSessionStore.getSessions()
        .find((item) => item.deviceLinkDeviceId === shardId)?.deviceLinkDeviceName
        ?? row.deviceLinkDeviceName
        ?? shardId;
      remoteSessionStore.upsertDeviceSession(shardId, shardName, row);
    }
    remoteSessionStore.requestReseed(shardId);
  } finally {
    releasePending();
  }
}
