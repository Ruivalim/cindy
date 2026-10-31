import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseLegalSegments } from '../LoginControls';
import { SUPPORTED_LOCALES } from '../../../../shared/locale';
import { CONSENT_DIALOG, CONSENT_ROW } from '../loginDesignTokens';

/**
 * 协议文案 catalog 严校验(codex 审查 P2):parseLegalSegments 对坏标记 fail-open
 * (嵌套/未闭合时原样显示尖括号)——法律文案不许依赖这种降级。本测试把全部 5 语
 * catalog 的 consent 文案过 parser 严校验,翻译误改标记时在 CI 就地拦截。
 * 手机端镜像:apps/mobile/src/auth/__tests__/loginConsent.test.ts「catalog 过 parser
 * 严校验」用例(双端 parser 同源语义,修改任一侧必须同步另一侧)。
 */

const LOCALES = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'] as const;

function loadLogin(locale: string): Record<string, unknown> {
  const raw = readFileSync(
    resolve(process.cwd(), `src/renderer/i18n/locales/${locale}/common.json`),
    'utf8',
  );
  return (JSON.parse(raw) as { login: Record<string, unknown> }).login;
}

describe('consent 文案 catalog 严校验(5 语 × statement/body)', () => {
  it.each(LOCALES)('%s:恰一 terms + 恰一 privacy,文本段无残留尖括号', (locale) => {
    const login = loadLogin(locale);
    const dialog = login.consentDialog as { body: string };
    const texts = [login.consentStatement as string, dialog.body];
    for (const text of texts) {
      const segments = parseLegalSegments(text);
      expect(segments.filter((s) => s.kind === 'terms')).toHaveLength(1);
      expect(segments.filter((s) => s.kind === 'privacy')).toHaveLength(1);
      for (const s of segments) {
        expect(s.text.length).toBeGreaterThan(0);
        // 所有段(含链接段)禁残留尖括号:嵌套坏标记的残余会落在链接段文本里
        expect(s.text).not.toMatch(/[<>]/);
        if (s.kind !== 'text') expect(s.text.length).toBeGreaterThan(1);
      }
    }
  });

  it('parser 边界行为文档化:未闭合/嵌套标记 fail-open 原样透传(不崩溃)', () => {
    // 未闭合:整串按纯文本透传(严校验用例保证生产 catalog 永远不落入此分支)
    expect(parseLegalSegments('<terms>未闭合')).toEqual([{ kind: 'text', text: '<terms>未闭合' }]);
    // 嵌套:非贪婪匹配吞到最近的 </terms>,terms 段文本带内层标记原文——
    // 严校验用例的「所有段禁残留尖括号」检查即为拦这种坏 catalog 而设;
    // 此处仅锁 fail-open 不崩溃的现状
    expect(parseLegalSegments('<terms>A<privacy>B</privacy></terms>')).toEqual([
      { kind: 'terms', text: 'A<privacy>B</privacy>' },
    ]);
  });
});

describe('区域确认文案排版预算(标准 26/40，最多 3 行)', () => {
  const maxEstimatedUnits = (CONSENT_DIALOG.body.width * 0.95 * 3) / CONSENT_DIALOG.body.fontSize;
  const estimatedUnits = (value: string) =>
    [...value].reduce(
      (sum, character) => sum + ((character.codePointAt(0) ?? 0) <= 0xff ? 0.5 : 1),
      0,
    );

  it.each(LOCALES)('%s:CN / Global 正文固定两行且每行无需二次折行', (locale) => {
    const realmConsent = loadLogin(locale).realmConsent as {
      bodyCn: string;
      bodyGlobal: string;
    };
    for (const body of [realmConsent.bodyCn, realmConsent.bodyGlobal]) {
      const lines = body.split('\n');
      expect(lines, `${locale}: ${body}`).toHaveLength(2);
      for (const line of lines) {
        expect(estimatedUnits(line), `${locale}: ${line}`).toBeLessThanOrEqual(
          maxEstimatedUnits / 3,
        );
      }
    }
  });
});

// DESIGN.md §16.2 长度预算:协议行是单行槽,超长只能改文案,禁止缩字号 / 折行吸收。
// 协议行在 680 宽内居中,超预算时两端被裁(de 实测:radio 看不见、句尾被切)。
describe('协议行单行长度预算(全部语言)', () => {
  const estimate = (value: string) =>
    [...value].reduce((sum, character) => sum + ((character.codePointAt(0) ?? 0) <= 0xff ? 0.5 : 1), 0);
  const budgetUnits = ((CONSENT_ROW.width - CONSENT_ROW.radio.hitSize - CONSENT_ROW.gap) * 0.95) / CONSENT_ROW.fontSize;

  it.each(SUPPORTED_LOCALES)('%s:协议声明不超出协议行', (locale) => {
    const statement = parseLegalSegments(loadLogin(locale).consentStatement as string)
      .map((segment) => segment.text)
      .join('');
    expect(estimate(statement), statement).toBeLessThanOrEqual(budgetUnits);
  });
});
