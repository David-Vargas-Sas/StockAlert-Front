# StockAlert Front

Frontend web de StockAlert, una aplicacion Angular para la gestion de inventario, productos, ventas, compras, clientes, proveedores, alertas, usuarios, roles, empresas y auditoria.

La aplicacion consume una API REST local, maneja autenticacion con token, protege rutas por rol/permisos y expone un dashboard administrativo para la operacion del sistema.

## Tabla de contenido

- [Tecnologias](#tecnologias)
- [Requisitos previos](#requisitos-previos)
- [Instalacion](#instalacion)
- [Ejecucion en desarrollo](#ejecucion-en-desarrollo)
- [Scripts disponibles](#scripts-disponibles)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Rutas principales](#rutas-principales)
- [Conexion con el backend](#conexion-con-el-backend)
- [Autenticacion y permisos](#autenticacion-y-permisos)
- [Pruebas](#pruebas)
- [Build de produccion](#build-de-produccion)

## Tecnologias

- Angular 21
- Angular Router
- Angular HttpClient
- Angular Material / CDK
- Tailwind CSS 4
- RxJS
- TypeScript
- Selenium WebDriver para pruebas end-to-end
- Vitest / Angular test builder para pruebas unitarias

## Requisitos previos

Antes de instalar el proyecto, asegurese de tener:

- Node.js instalado
- npm instalado
- Angular CLI disponible localmente desde las dependencias del proyecto
- Backend de StockAlert ejecutandose en `http://localhost:8080`

El proyecto declara `npm@11.12.1` como package manager en `package.json`.

## Instalacion

Desde la raiz del proyecto:

```bash
npm install
```

Si estas ubicado en la carpeta contenedora del repositorio, entra primero al proyecto Angular:

```bash
cd StockAlert-Fron
npm install
```

## Ejecucion en desarrollo

Para levantar la aplicacion:

```bash
npm start
```

Este comando ejecuta:

```bash
ng serve --host 0.0.0.0 -o
```

La aplicacion queda disponible normalmente en:

```text
http://localhost:4200
```

El navegador se abre automaticamente y Angular recarga la aplicacion cuando detecta cambios en el codigo.

## Scripts disponibles

| Comando | Descripcion |
| --- | --- |
| `npm start` | Inicia el servidor de desarrollo de Angular. |
| `npm run build` | Compila la aplicacion para produccion en `dist/`. |
| `npm run watch` | Compila en modo observador usando configuracion de desarrollo. |
| `npm test` | Ejecuta las pruebas unitarias configuradas con Angular. |
| `npm run e2e` | Ejecuta las pruebas end-to-end con Selenium. |
| `npm run ng` | Ejecuta comandos de Angular CLI desde el proyecto. |

## Arquitectura del proyecto

La aplicacion usa la arquitectura standalone de Angular. El arranque esta en `src/main.ts`, la configuracion global en `src/app/app.config.ts` y las rutas en `src/app/app.routes.ts`.

```text
StockAlert-Fron/
|-- public/
|   `-- imagen/                 # Imagenes publicas, logo y favicon
|-- selenium/                   # Pruebas end-to-end con Selenium
|   |-- helpers/                # Utilidades para driver y autenticacion
|   `-- login.spec.js           # Prueba e2e de login
|-- src/
|   |-- app/
|   |   |-- feature/
|   |   |   |-- login/          # Pantalla de inicio de sesion
|   |   |   |-- register/       # Pantalla de registro
|   |   |   `-- dashboard/      # Layout y paginas internas del sistema
|   |   |       |-- pages/      # Modulos funcionales por dominio
|   |   |       |-- services/   # Servicios propios del dashboard
|   |   |       `-- shared/     # Componentes compartidos del dashboard
|   |   |-- services/           # Servicios HTTP y logica transversal
|   |   |-- app.config.ts       # Providers globales
|   |   |-- app.routes.ts       # Definicion de rutas
|   |   `-- app.ts              # Componente raiz
|   |-- main.ts                 # Bootstrap de la aplicacion
|   |-- material-theme.scss     # Tema de Angular Material
|   `-- styles.css              # Estilos globales y Tailwind
|-- angular.json                # Configuracion Angular CLI
|-- package.json                # Dependencias y scripts
`-- tsconfig*.json              # Configuracion TypeScript
```

### Capas principales

- `feature/login` y `feature/register`: pantallas publicas de autenticacion.
- `feature/dashboard`: layout principal protegido y pantallas internas.
- `feature/dashboard/pages`: paginas de negocio como productos, inventario, ventas, compras, clientes, proveedores, alertas, usuarios, roles, empresas y auditoria.
- `feature/dashboard/shared`: componentes reutilizables dentro del dashboard, como tablas, titulos, selectores y modales.
- `services`: servicios inyectables para comunicacion con la API, autenticacion, manejo de errores y entidades del sistema.

## Rutas principales

| Ruta | Descripcion |
| --- | --- |
| `/login` | Inicio de sesion. |
| `/register` | Registro de usuario. |
| `/app/dashboard` | Vista principal del dashboard. |
| `/app/productos` | Gestion de productos. |
| `/app/inventario` | Gestion de inventario. |
| `/app/ventas` | Gestion de ventas. |
| `/app/compras` | Gestion de compras. |
| `/app/clientes` | Gestion de clientes. |
| `/app/proveedores` | Gestion de proveedores. |
| `/app/alertas` | Gestion de alertas de stock. |
| `/app/usuarios` | Gestion de usuarios. |
| `/app/roles` | Gestion de roles y permisos. |
| `/app/empresas` | Gestion de empresas. |
| `/app/auditoria` | Consulta de auditoria y logs de sesion. |

Las rutas internas bajo `/app` estan protegidas por `authGuard`.

## Conexion con el backend

Los servicios HTTP consumen la API en:

```text
http://localhost:8080/api
```

Ejemplos de endpoints usados por la aplicacion:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `/api/products`
- `/api/products/paginated`
- `/api/products/low-stock`

Para trabajar correctamente en local, primero levanta el backend en el puerto `8080` y despues inicia este frontend con `npm start`.

## Autenticacion y permisos

La autenticacion se maneja en `src/app/services/auth.ts`.

El flujo general es:

1. El usuario inicia sesion desde `/login`.
2. El backend responde con `accessToken`, `refreshToken`, informacion del usuario, roles y permisos.
3. La sesion se guarda en `localStorage` con la llave `stockalert.auth.session`.
4. Los servicios agregan el token en el header `Authorization`.
5. `authGuard` valida acceso por autenticacion, roles y permisos definidos en las rutas.

Roles contemplados por el frontend:

- `SUPER_ADMIN`
- `ADMINISTRADOR`
- `VENDEDOR`
- `BODEGUERO`
- `CONSULTOR`

## Pruebas

### Pruebas unitarias

```bash
npm test
```

### Pruebas end-to-end

Las pruebas e2e estan en la carpeta `selenium/`.

Primero levanta la aplicacion:

```bash
npm start
```

En otra terminal, configura credenciales validas:

```powershell
$env:E2E_USERNAME="superadmin"
$env:E2E_PASSWORD="Admin1234"
npm run e2e
```

Opcionalmente puedes ejecutar Chrome en modo oculto:

```powershell
$env:E2E_HEADLESS="true"
npm run e2e
```

Tambien puedes cambiar la URL base:

```powershell
$env:E2E_BASE_URL="http://localhost:4200"
npm run e2e
```

## Build de produccion

Para generar una version de produccion:

```bash
npm run build
```

Los archivos compilados se generan en:

```text
dist/
```

La configuracion de produccion aplica optimizaciones y hashing de archivos segun `angular.json`.

## Notas de desarrollo

- Mantener las paginas de negocio dentro de `src/app/feature/dashboard/pages`.
- Crear servicios HTTP reutilizables dentro de `src/app/services`.
- Registrar rutas nuevas en `src/app/app.routes.ts`.
- Definir roles y permisos de acceso desde la propiedad `data` de cada ruta protegida.
- Mantener componentes compartidos del dashboard en `src/app/feature/dashboard/shared`.
