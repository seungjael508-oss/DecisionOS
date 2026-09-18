// 동일 PC·계정·프로젝트의 인증된 전체 HTML 응답을 측정한다. 메일·비밀번호·업무 데이터 쓰기는 하지 않는다.
import { chromium } from '@playwright/test';
import { createInterface } from 'node:readline/promises';
import { writeFile } from 'node:fs/promises';

const label = process.argv[2];
const outputPath = process.argv[3];
if (!['before', 'after'].includes(label) || !outputPath || process.argv.includes('--help')) {
  console.log('Usage: node scripts/measure-production-navigation.mjs before|after /private/tmp/result.json');
  console.log('Chrome 창에서 같은 계정으로 직접 로그인한 뒤 터미널 Enter. 계정·쿠키·응답 본문은 저장하지 않습니다.');
  process.exit(process.argv.includes('--help') ? 0 : 1);
}
const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.goto('https://stayj.co.kr/login');
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  await prompt.question('동일한 측정 계정으로 직접 로그인 완료 후 Enter: ');
  prompt.close();
  // 측정 중 앱의 링크 prefetch가 경합하지 않도록 빈 동일 origin 페이지로 전환한다.
  const origin = 'https://stayj.co.kr';
  if (new URL(page.url()).origin !== origin || new URL(page.url()).pathname === '/login') {
    throw new Error('로그인 완료를 확인하지 못했습니다.');
  }
  const project = '1283e198-5043-4027-96d6-edcc7a6686c6';
  const base = `/projects/${project}/move-in`;
  await page.route(`${origin}/__perf_measurement__`, route => route.fulfill({ contentType: 'text/html', body: '<title>Read-only performance measurement</title>' }));
  await page.goto(`${origin}/__perf_measurement__`);
  const cases = [{ name: 'units', path: `${base}/units`, marker: '동호수 관리' }, { name: 'dashboard', path: base, marker: 'Legacy 초기 현황' }];
  const samples = [];
  // 첫 1회는 warm-up으로 분리하고, 같은 순서로 10회씩 직렬 측정한다.
  for (let round = 0; round <= 10; round++) {
    for (const target of cases) {
      const result = await page.evaluate(async ({ path, marker }) => {
        const start = performance.now();
        const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
        const headersAt = performance.now();
        const html = await response.text();
        const end = performance.now();
        if (!response.ok || !new RegExp(`<h[12][^>]*>${marker}</h[12]>`).test(html)) throw new Error('정상 인증 페이지 응답이 아닙니다.');
        return { status: response.status, headersMs: headersAt - start, fullResponseMs: end - start, responseBytes: new TextEncoder().encode(html).length };
      }, target);
      samples.push({ page: target.name, round, warmup: round === 0, ...result });
      await page.waitForTimeout(1000);
    }
  }
  const summary = Object.fromEntries(cases.map(target => {
    const values = samples.filter(s => s.page === target.name && !s.warmup).map(s => s.fullResponseMs).sort((a, b) => a - b);
    return [target.name, { medianMs: (values[4] + values[5]) / 2, p95Ms: values[9], minMs: values[0], maxMs: values[9] }];
  }));
  const report = { label, measuredAt: new Date().toISOString(), origin, project, metric: 'authenticated full HTML response; excludes loading UI and client render', samples, summary };
  await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.table(summary);
  console.log(`Saved timings only: ${outputPath}`);
} finally {
  await browser.close();
}
