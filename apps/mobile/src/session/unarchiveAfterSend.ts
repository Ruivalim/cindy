import { isSharedTaskPeer } from '@cindy/device-link';
import type { RemoteInvoke } from '@/device-link/mobileMakerTransport';
import { isHostManagedSession } from './hostManagedSession';
import { remoteSessionStore, resolveSessionWriteDevices, sessionPendingWrites } from './remoteSessionStore';

/**
 * 与桌面一致:在已归档任务里发出的消息被电脑接收后,任务自动取消归档。
 *
 * 只能在电脑已确认收到消息之后调用——离线时消息先落进手机的待发队列,等重连送达
 * 才算发出,取消归档也跟着那一刻走,而不是在写入本地队列时一次性发起。
 * 菜单本来就不提供取消归档的任务(伙伴托管、分享来的任务、协同 Worker)不在这里改状态。
 * 取消归档失败不影响已送达的消息:还原乐观状态并重新对账,任务保持已归档。
 */
export async function unarchiveSessionAfterSend(
  sessionId: string,
  deviceId: string,
  invoke: RemoteInvoke,
): Promise<void> {
  const row = remoteSessionStore.getSessions().find((item) => item.id === sessionId);
  if (row?.status !== 'archived' || row.orcaRole === 'worker') return;
  if (isHostManagedSession(row) || isSharedTaskPeer(deviceId)) return;
  const { rpcDeviceId, shardId } = resolveSessionWriteDevices(sessionId, row, deviceId)
    ?? { rpcDeviceId: deviceId, shardId: deviceId };
  const releasePending = sessionPendingWrites.track(sessionId, ['status']);
  remoteSessionStore.applySessionPatch(shardId, sessionId, { status: 'active' });
  try {
    await invoke(rpcDeviceId, 'local-db:sessions:patch-meta', [sessionId, { status: 'active' }]);
  } catch {
    // 把状态改回 archived 会让行移出列表;与页面里的归档回滚一样,整行插回原物理 shard。
    // 先释放在途登记,否则 upsert 会因 status 在途而被挡掉。
    releasePending();
    const shardName = remoteSessionStore.getSessions()
      .find((item) => item.deviceLinkDeviceId === shardId)?.deviceLinkDeviceName
      ?? row.deviceLinkDeviceName
      ?? shardId;
    remoteSessionStore.upsertDeviceSession(shardId, shardName, row);
    remoteSessionStore.requestReseed(shardId);
  } finally {
    releasePending();
  }
}
