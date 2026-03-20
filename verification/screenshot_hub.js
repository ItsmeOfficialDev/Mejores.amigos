const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // We need to bypass auth or mock it.
  // Since we are running in the sandbox, we can just point to the file but it won't execute scripts correctly without a server.
  // However, we can use a data URL or just check the HTML/CSS structure.

  // Alternative: Mock localStorage and check layout
  await page.addInitScript(() => {
    window.localStorage.setItem('mejoresAmigosUser', JSON.stringify({ name: 'Ishan', isAdmin: true }));
  });

  // Since the script in hub.html calls /api/me, we should mock that too if we want a full render.
  await page.route('**/api/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: { name: 'Ishan', isAdmin: true } })
  }));

  await page.goto('file://' + path.join(__dirname, '../public/hub.html'));
  await page.waitForTimeout(1000); // Wait for animations
  await page.screenshot({ path: 'verification/hub_render.png', fullPage: true });
  await browser.close();
})();
