module.exports = {
  testDir: './tests', testMatch: '**/*.spec.cjs', timeout: 20000,
  workers: 1, reporter: 'list',
  use: { browserName: 'chromium', viewport: { width: 840, height: 696 }, baseURL: 'http://127.0.0.1:4173', headless: true },
  webServer: { command: 'node tools/preview.cjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
};
