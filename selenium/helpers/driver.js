const { Builder } = require('selenium-webdriver');
const chromedriver = require('chromedriver');
const chrome = require('selenium-webdriver/chrome');

const DEFAULT_BASE_URL = 'http://localhost:4200';

function baseUrl() {
  return process.env.E2E_BASE_URL || DEFAULT_BASE_URL;
}

async function createDriver() {
  console.log('Creando navegador Chrome...');
  const options = new chrome.Options();
  const service = new chrome.ServiceBuilder(chromedriver.path);

  if (process.env.E2E_HEADLESS === 'true') {
    options.addArguments('--headless=new');
  }

  options.addArguments('--window-size=1440,900');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .setChromeService(service)
    .build();

  console.log('Chrome listo.');
  return driver;
}

async function closeDriver(driver) {
  if (driver) {
    await driver.quit();
  }
}

module.exports = {
  baseUrl,
  closeDriver,
  createDriver,
};
