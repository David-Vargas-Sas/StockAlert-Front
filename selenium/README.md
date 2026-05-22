# Pruebas Selenium

Carpeta base para pruebas end-to-end de StockAlert con Selenium.

## Instalar dependencias

```bash
npm install -D selenium-webdriver chromedriver
```

## Levantar la app

En una terminal:

```bash
npm start
```

La URL por defecto de las pruebas es `http://localhost:4200`.

## Ejecutar pruebas

```bash
npm run e2e
```

## Credenciales

La prueba necesita credenciales validas:

```bash
$env:E2E_USERNAME="superadmin"
$env:E2E_PASSWORD="Admin1234"
npm run e2e
```

Chrome se abre visible por defecto. Si quieres correrlo oculto:

```bash
$env:E2E_HEADLESS="true"
npm run e2e
```

Tambien puedes cambiar la URL:

```bash
$env:E2E_BASE_URL="http://localhost:4200"
npm run e2e
```

## Estructura

- `helpers/driver.js`: crea y cierra el navegador.
- `helpers/auth.js`: login reutilizable.
- `login.spec.js`: valida que el login permita entrar al dashboard.
