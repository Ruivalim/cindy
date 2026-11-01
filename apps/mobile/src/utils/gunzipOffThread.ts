import { recordGunzip } from '@/debug/jankMetrics';
import { decodeGzipBase64TextBounded } from './gzipBase64';
import { gunzipBase64Worklet, type GunzipWorkletResult } from './gunzipBase64Worklet';

/** Below this a runtime hop costs about as much as decoding in place. */
export const OFF_THREAD_GUNZIP_MIN_BASE64_CHARS = 64 * 1024;
/** Runs are serial, so this also has to cover a short backlog of large results. */
export const OFF_THREAD_GUNZIP_TIMEOUT_MS = 10_000;

type Schedule = (base64: string, maxChars: number, done: (result: GunzipWorkletResult) => void) => void;

/** Uses the worklets package every build already ships, so this needs no native change. */
function createWorkletSchedule(): Schedule | null {
  try {
    const { createWorkletRuntime, scheduleOnRN, scheduleOnRuntime } =
      require('react-native-worklets') as typeof import('react-native-worklets');
    const runtime = createWorkletRuntime({ name: 'cindy-gunzip' });
    return (base64, maxChars, done) => {
      scheduleOnRuntime(runtime, (input: string, limit: number) => {
        'worklet';
        scheduleOnRN(done, gunzipBase64Worklet(input, limit));
      }, base64, maxChars);
    };
  } catch {
    return null;
  }
}

function clock(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

export function createOffThreadGunzip(options: {
  createSchedule: () => Schedule | null;
  decodeOnThread?: (base64: string, maxChars: number) => string;
  minBase64Chars?: number;
  timeoutMs?: number;
}): (base64: string, maxChars: number) => Promise<string> {
  const decodeOnThread = options.decodeOnThread ?? decodeGzipBase64TextBounded;
  const minChars = options.minBase64Chars ?? OFF_THREAD_GUNZIP_MIN_BASE64_CHARS;
  const timeoutMs = options.timeoutMs ?? OFF_THREAD_GUNZIP_TIMEOUT_MS;
  let schedule: Schedule | null | undefined;

  const onThread = (base64: string, maxChars: number, fallback: boolean) => {
    const startedAt = clock();
    try {
      return decodeOnThread(base64, maxChars);
    } finally {
      recordGunzip({ offThread: false, onThreadMs: clock() - startedAt, fallback });
    }
  };

  return async (base64, maxChars) => {
    if (base64.length < minChars) return onThread(base64, maxChars, false);
    if (schedule === undefined) schedule = options.createSchedule();
    const run = schedule;
    if (!run) return onThread(base64, maxChars, true);
    const result = await new Promise<GunzipWorkletResult | null>((resolve) => {
      const timer = setTimeout(() => {
        // A runtime that stopped answering would delay every later result by the full timeout.
        if (schedule === run) schedule = null;
        resolve(null);
      }, timeoutMs);
      try {
        run(base64, maxChars, (value) => {
          clearTimeout(timer);
          resolve(value);
        });
      } catch {
        clearTimeout(timer);
        resolve(null);
      }
    });
    if (result?.ok) {
      recordGunzip({ offThread: true });
      return result.text;
    }
    if (result?.limitExceeded) throw new RangeError(result.message);
    // pako stays the authority: an unexpected failure here must not fail a valid response.
    return onThread(base64, maxChars, true);
  };
}

export const gunzipBase64OffThread = createOffThreadGunzip({ createSchedule: createWorkletSchedule });
