import { chromium } from 'playwright';
const S = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const url = 'file:///home/user/vibe-studio-/hero-wdialogu/index.html';
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.waitForTimeout(2600);
await page.screenshot({ path: `${S}/shots/f-01-fold.png` });
await page.waitForTimeout(3600);            // ~6.2s: path 1→2 drawing
await page.screenshot({ path: `${S}/shots/f-02-path.png`, fullPage: true });
await page.waitForTimeout(4200);            // ~10.4s: verify
await page.screenshot({ path: `${S}/shots/f-03-verify.png`, fullPage: true });
await page.waitForTimeout(6000);            // ~16.4s: pay finished
await page.screenshot({ path: `${S}/shots/f-04-pay.png`, fullPage: true });
const big = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await big.goto(url); await big.waitForTimeout(2600);
await big.screenshot({ path: `${S}/shots/f-05-1920.png` });
const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
await m.goto(url); await m.waitForTimeout(3000);
await m.screenshot({ path: `${S}/shots/f-06-mobile.png`, fullPage: true });
console.log('errors:', JSON.stringify(errors));
await browser.close();
