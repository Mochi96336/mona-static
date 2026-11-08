import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175/mona-static/';
const browser = await chromium.launch({headless: true});
const page = await browser.newPage({viewport: {width: 1365, height: 850}});
const failures = [];
page.on('pageerror', error => failures.push('JavaScript exception: ' + error.message));
page.on('response', response => {
  if (response.url().startsWith(base) && response.status() >= 400) {
    failures.push('HTTP ' + response.status() + ' ' + response.url());
  }
});

async function route(hash, selector) {
  await page.goto(base + '#/' + hash, {waitUntil: 'domcontentloaded', timeout: 45000});
  await page.locator(selector).first().waitFor({state: 'visible', timeout: 60000});
  await page.waitForTimeout(700);
  console.log('PASS: #/' + hash + ' displays ' + selector);
}

try {
  await route('calculate', '.calculator-page');
  // Calculator view waits for WASM initialisation in async setup.
  const artifactUrl = new URL('release-assets/img/AetherAnemo_splash.4d3b4344.webp', base).toString();
  const assetStatus = await page.evaluate(async url => (await fetch(url)).status, artifactUrl);
  if (assetStatus !== 200) failures.push('Bundled image asset returned ' + assetStatus);
  await route('team-optimization', '.team-configurations');
  await route('uid-data', '.mys-import');
  if ((await page.locator('body').innerText()).includes('扫码登录需要本机服务')) {
    failures.push('Static build displayed a missing-local-server login error');
  }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('PASS: calculator, team configuration, UID JSON import view and static asset loaded without same-origin 404s');
} finally {
  await browser.close();
}
