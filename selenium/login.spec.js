const assert = require('node:assert/strict');
const test = require('node:test');
const { By, until } = require('selenium-webdriver');
const { hasCredentials, login } = require('./helpers/auth');
const { closeDriver, createDriver } = require('./helpers/driver');

test('login: permite entrar al dashboard con credenciales validas', async () => {
  assert.ok(hasCredentials(), 'Define E2E_USERNAME y E2E_PASSWORD antes de ejecutar npm run e2e.');

  console.log('Iniciando prueba Selenium de login...');
  const driver = await createDriver();

  try {
    await login(driver);

    const currentUrl = await driver.getCurrentUrl();
    console.log(`URL actual: ${currentUrl}`);

    const brand = await driver.wait(until.elementLocated(By.css('.brand strong')), 5000);

    assert.match(currentUrl, /\/app\/dashboard/);
    assert.equal(await brand.getText(), 'StockAlert');
    console.log('Prueba completada: login exitoso.');
  } finally {
    await closeDriver(driver);
  }
});
