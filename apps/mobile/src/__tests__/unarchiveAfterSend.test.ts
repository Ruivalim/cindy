import { beforeEach, describe, expect, it, vi } from 'vitest';
import { remoteSessionStore, sessionMetaWriteGuard } from '@/session/remoteSessionStore';
import { unarchiveSessionAfterSend } from '@/session/unarchiveAfterSend';
import type { RemoteSession } from '@/session/types';

function session(id: string, patch: Partial<RemoteSession> = {}): RemoteSession {
  return {
    id, userId: 'user-1', title: id, workingDir: '/repo', workspaceKind: 'project', model: 'claude',
    effort: 'medium', permissionMode: 'default', fastMode: false, status: 'archived', agentKind: 'cc',
    userSendAt: null, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
  };
}

const statusOf = (id: string) => remoteSessionStore.getSessions().find((item) => item.id === id)?.status;

describe('unarchiveSessionAfterSend', () => {
  beforeEach(() => remoteSessionStore.clear());

  it('writes status active to the host once the message is accepted', async () => {
    remoteSessionStore.setDeviceSessions('dev-1', 'Mac', [session('s1')]);
    const invoke = vi.fn(async () => ({}));
    await unarchiveSessionAfterSend('s1', 'dev-1', invoke as never);
    expect(invoke).toHaveBeenCalledWith('dev-1', 'local-db:sessions:patch-meta', ['s1', { status: 'active' }], { preSend: expect.any(Function) });
    expect(statusOf('s1')).toBe('active');
  });

  it('keeps the task archived when the host write fails, without surfacing an error', async () => {
    remoteSessionStore.setDeviceSessions('dev-1', 'Mac', [session('s1')]);
    const invoke = vi.fn(async () => { throw new Error('HOST_REJECTED'); });
    await expect(unarchiveSessionAfterSend('s1', 'dev-1', invoke as never)).resolves.toBeUndefined();
    expect(statusOf('s1')).toBe('archived');
  });

  it('lets a later archive win: the stale unarchive neither retries nor rolls the row back', async () => {
    remoteSessionStore.setDeviceSessions('dev-1', 'Mac', [session('s1')]);
    let fail: (error: Error) => void = () => {};
    const invoke = vi.fn((_d: string, _c: string, _a?: unknown[], options?: { preSend?: () => void }) => {
      options?.preSend?.();
      return new Promise((_resolve, reject) => { fail = reject; });
    });
    const pending = unarchiveSessionAfterSend('s1', 'dev-1', invoke as never);
    sessionMetaWriteGuard.begin('s1', ['status']); // 用户随后又归档/删除了这个任务
    fail(new Error('HOST_REJECTED'));
    await pending;
    expect(statusOf('s1')).toBe('active');
  });

  it.each([
    ['an active task', session('s1', { status: 'active' })],
    ['a Bot-managed task', session('s1', { source: 'bot' })],
    ['a collaboration worker', session('s1', { orcaRole: 'worker' })],
  ])('leaves %s alone', async (_name, row) => {
    remoteSessionStore.setDeviceSessions('dev-1', 'Mac', [row]);
    const invoke = vi.fn(async () => ({}));
    await unarchiveSessionAfterSend('s1', 'dev-1', invoke as never);
    expect(invoke).not.toHaveBeenCalled();
    expect(statusOf('s1')).toBe(row.status);
  });
});
