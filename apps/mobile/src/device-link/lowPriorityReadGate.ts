import { DeviceLinkError } from '@cindy/device-link';

/**
 * Returning to the foreground makes every mounted roster, card and home row refresh at once.
 * The per-peer InvokeScheduler allows 12 at a time for each computer, so several computers can
 * deliver hundreds of responses while the JS thread is also restoring the open task. These
 * refresh reads are spread out across all computers instead; anything else keeps its own path.
 */
const LOW_PRIORITY_READ_CHANNELS: ReadonlySet<string> = new Set([
  'git-context:pr-refs:list',
  'git-context:pr-status',
  'maker:remote-resources:manifest',
  'maker:remote-resources:list',
]);

export const LOW_PRIORITY_READ_MAX_ACTIVE = 4;
const MAX_QUEUED = 256;

export function isLowPriorityRead(channel: string): boolean {
  return LOW_PRIORITY_READ_CHANNELS.has(channel);
}

interface QueuedRead {
  key: string | null;
  task: () => Promise<unknown>;
  waiters: { resolve(value: unknown): void; reject(reason: unknown): void }[];
}

export interface LowPriorityReadGate {
  /**
   * A `key` joins an identical read that has not been dispatched yet. Joining one already on the
   * wire could hand back a snapshot taken before the change this caller is refreshing for, so an
   * in-flight read is never shared. Pass null when the task has caller-specific cancellation.
   * Joined callers receive the same result object, as useRemoteCompanionQuery's cards already do;
   * consumers of these channels normalize or copy it rather than mutating it.
   */
  run<T>(key: string | null, task: () => Promise<T>): Promise<T>;
}

export function createLowPriorityReadGate(maxActive = LOW_PRIORITY_READ_MAX_ACTIVE): LowPriorityReadGate {
  const queue: QueuedRead[] = [];
  const queuedByKey = new Map<string, QueuedRead>();
  let active = 0;

  const drain = () => {
    while (active < maxActive && queue.length > 0) {
      const read = queue.shift()!;
      if (read.key !== null) queuedByKey.delete(read.key);
      active += 1;
      void Promise.resolve()
        .then(read.task)
        .then(
          (value) => { for (const waiter of read.waiters) waiter.resolve(value); },
          (error: unknown) => { for (const waiter of read.waiters) waiter.reject(error); },
        )
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };

  return {
    run<T>(key: string | null, task: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const waiter = { resolve: resolve as (value: unknown) => void, reject };
        const joined = key === null ? undefined : queuedByKey.get(key);
        if (joined) {
          joined.waiters.push(waiter);
          return;
        }
        if (queue.length >= MAX_QUEUED) {
          reject(new DeviceLinkError('BACKPRESSURE', 'too many low-priority reads queued'));
          return;
        }
        const read: QueuedRead = { key, task, waiters: [waiter] };
        queue.push(read);
        if (key !== null) queuedByKey.set(key, read);
        drain();
      });
    },
  };
}
