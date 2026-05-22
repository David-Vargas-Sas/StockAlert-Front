const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { By, until } = require('selenium-webdriver');
const { baseUrl } = require('./driver');

function hasCredentials() {
  return Boolean(process.env.E2E_USERNAME && process.env.E2E_PASSWORD);
}

async function login(driver) {
  assert.ok(hasCredentials(), 'Define E2E_USERNAME y E2E_PASSWORD para pruebas autenticadas.');

  console.log(`Abriendo login: ${baseUrl()}/login`);
  await driver.get(`${baseUrl()}/login`);

  console.log('Buscando campos de usuario y contrasena...');
  const usernameInput = await driver.wait(until.elementLocated(By.css('input[formControlName="username"]')), 5000);
  const passwordInput = await driver.findElement(By.css('input[formControlName="password"]'));

  console.log(`Escribiendo usuario: ${process.env.E2E_USERNAME}`);
  await usernameInput.clear();
  await usernameInput.sendKeys(process.env.E2E_USERNAME);
  await passwordInput.clear();
  await passwordInput.sendKeys(process.env.E2E_PASSWORD);

  console.log('Enviando formulario de login...');
  await driver.findElement(By.css('button[type="submit"]')).click();

  console.log('Esperando redireccion al dashboard...');
  try {
    await driver.wait(until.urlContains('/app/dashboard'), 15000);
  } catch (error) {
    const currentUrl = await driver.getCurrentUrl();
    const loginError = await readOptionalText(driver, '.login-error');
    const screenshotPath = await saveScreenshot(driver);

    throw new Error(
      [
        'El login no llego al dashboard.',
        `URL actual: ${currentUrl}`,
        loginError ? `Mensaje en pantalla: ${loginError}` : 'No se encontro mensaje de error visible.',
        `Screenshot: ${screenshotPath}`,
        `Detalle original: ${error.message}`,
      ].join('\n'),
    );
  }
}

async function readOptionalText(driver, selector) {
  const elements = await driver.findElements(By.css(selector));
  if (!elements.length) {
    return '';
  }

  return elements[0].getText();
}

async function saveScreenshot(driver) {
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const screenshotPath = path.join(screenshotsDir, `login-${Date.now()}.png`);
  const image = await driver.takeScreenshot();
  fs.writeFileSync(screenshotPath, image, 'base64');

  return screenshotPath;
}

module.exports = {
  hasCredentials,
  login,
};
