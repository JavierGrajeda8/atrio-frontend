# Previews con Cloudflare Pages (FR-11)

Cada PR debe poder mostrar **3 previews**: `web`, `guard` y `pass`. Los proyectos de Cloudflare Pages los crea el dueño del producto en el panel (una sola vez); esta guía deja todo lo que hay que escribir. El requisito está en `docs/SPEC.md` §9.11 (entorno `preview`: frontend por PR en Cloudflare Pages).

> Esta guía vive en `frontend-docs/` porque `docs/` es una copia del backend (REP-01) y no se edita aquí.

## Resumen

| | `web` | `guard` | `pass` |
|---|---|---|---|
| Nombre sugerido del proyecto | `atrio-web` | `atrio-guard` | `atrio-pass` |
| Paquete (filtro de pnpm) | `@atrio/web` | `@atrio/guard` | `@atrio/pass` |
| **Comando de build** | `pnpm --filter @atrio/web build` | `pnpm --filter @atrio/guard build` | `pnpm --filter @atrio/pass build` |
| **Directorio de salida** | `apps/web/dist` | `apps/guard/dist` | `apps/pass/dist` |
| Directorio raíz | `/` (la raíz del repo) | `/` | `/` |
| Preset de framework | Ninguno | Ninguno | Ninguno |
| `_redirects` (SPA) | no hace falta (ver abajo) | no hace falta | no hace falta |
| `_headers` | lo genera el build | lo genera el build | lo genera el build |

El directorio raíz es la **raíz del repo** (no `apps/<app>`): el build necesita `pnpm-lock.yaml`, `packages/*` y `openapi/openapi.json`, que están fuera de cada app.

## Crear cada proyecto (3 veces)

Los nombres de los menús cambian de vez en cuando; lo que importa son los valores.

1. En el panel de Cloudflare: **Workers & Pages → Create application → Pages → Connect to Git** (en la pantalla de Workers suele haber un enlace «Looking to deploy Pages?»).
2. Autoriza la app de GitHub de Cloudflare sobre el repo `JavierGrajeda8/atrio-frontend` y elígelo.
3. Configura el build con los valores de la tabla de arriba:
   - **Project name:** `atrio-web` (o `atrio-guard`, `atrio-pass`).
   - **Production branch:** `main`.
   - **Framework preset:** *None*.
   - **Build command** y **Build output directory:** los de la tabla.
   - **Root directory** (en *Advanced*): déjalo vacío o `/`.
4. **Environment variables** (en *Production* y en *Preview*):

   | Variable | Valor | Para qué |
   |---|---|---|
   | `PNPM_VERSION` | `10.0.0` | La misma versión de pnpm que fija `packageManager` y usa el CI. Cloudflare trae otra por defecto. |
   | `ATRIO_API_ORIGIN` | `https://<origen de la API de staging>` | Abre la API en la CSP (`connect-src`). **Todavía no existe una API de staging** (M0b): hasta entonces no la definas; el build deja `connect-src 'self'` y las apps no llaman a la API todavía. Debe ser un origen `https://host[:puerto]` sin ruta ni comodines; si no, el build falla a propósito. |

   No hace falta `NODE_VERSION`: Cloudflare lee `.nvmrc` (Node 22). Tampoco `SKIP_DEPENDENCY_INSTALL`: Cloudflare detecta `pnpm-lock.yaml` e instala las dependencias solo.
5. **Save and Deploy.** El primer build debe terminar en verde.
6. Luego, en el proyecto: **Settings → Builds**
   - **Branch control → Preview branches:** *All non-Production branches* (así cada PR tiene su preview).
   - **Build watch paths** (opcional, ahorra builds): incluye `apps/<app>/*`, `packages/*`, `openapi/*`, `pnpm-lock.yaml` y `package.json`.
   - **Comentarios de PR:** deja activado el comentario con el enlace de preview.

Repite para las otras dos apps. Al terminar cada PR debería mostrar tres URLs `https://<rama>.<proyecto>.pages.dev`.

## `_redirects` y rutas de la SPA: no hacen falta

Las tres apps son SPA (`web` con TanStack Router, `guard` con su ruteo por `pathname`, `pass` con una sola pantalla). Una URL como `/visits` o `/scan` no es un archivo, así que el servidor debe devolver el shell.

**Cloudflare Pages ya lo hace solo:** si el proyecto **no tiene un `404.html` en la raíz**, Pages asume una SPA y sirve `index.html` para cualquier ruta que no corresponda a un archivo ([Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)). Por eso **no hay `_redirects`**, y **ninguna app debe tener un `404.html`**: lo desactivaría (una prueba lo vigila).

No uses la regla clásica `/* /index.html 200`. Se probó con el emulador de Pages (`wrangler pages dev`, mismo código que usa Pages para leer `_redirects` y `_headers`) y la **rechaza**:

```text
Infinite loop detected in this rule and has been ignored. This will cause a redirect to strip `.html` or `/index` and end up triggering this rule again.
```

Con el comportamiento por defecto, el mismo emulador sirvió el shell en `/`, `/scan` y `/walk-in`, y los archivos reales (`/sw.js`, `/manifest.webmanifest`, `/assets/*.js`, `/icons/*.svg`) con su tipo correcto. Si algún día hace falta una redirección real (p. ej. un dominio viejo), se agrega `apps/<app>/public/_redirects` y se documenta aquí.

## Cabeceras de seguridad

`dist/_headers` lo genera el build de cada app (FR-09, `packages/config/security-headers.ts`): CSP estricta, Trusted Types, COOP, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. Cloudflare Pages las aplica a todos los archivos, incluidas las previews. El emulador de Pages reporta `Parsed 1 valid header rule` con ese archivo.

## Verificar un preview (lo hace el dueño del producto)

Para cada una de las 3 URLs del PR:

1. Abre la URL: carga sin errores (en la consola de DevTools no debe haber violaciones de CSP).
2. Abre una ruta interna directamente, por ejemplo `https://…/visits` en `web` o `https://…/scan` en `guard`: debe mostrar la app, no un 404.
3. Revisa las cabeceras de la respuesta (DevTools → Network, o `curl -I <url>`): `content-security-policy`, `cross-origin-opener-policy: same-origin`, `x-content-type-options: nosniff`, y `referrer-policy: no-referrer` solo en `pass`.
4. `guard`: en *Application → Service Workers* debe aparecer `/sw.js` activado; con *Offline* marcado, recargar debe abrir el shell.
5. `pass`: abre `…/#cualquier-token`; la página muestra la estructura del pase y el token **no** aparece en ninguna petición.

### Probar en local con el mismo motor de Pages

```sh
make build
npx wrangler pages dev apps/web/dist     # o apps/guard/dist, apps/pass/dist
```

`wrangler` no es una dependencia del repo: `npx` lo descarga al usarlo.

## Recomendaciones (decisión del dueño)

- **Proteger las previews.** Las URLs `*.pages.dev` son públicas por defecto. Cuando las previews apunten a una API de staging (M0b), conviene restringirlas con Cloudflare Access (**Settings → General → Enable access policy**). No lo configuro yo: es una decisión de acceso.
- **Dominio y producción.** Esta guía cubre solo previews. Los dominios (`app.<dominio>`, `pase.<dominio>`, garita) y el despliegue de producción son de M0b y de los issues de infraestructura.

## Si un build falla

| Síntoma | Causa probable |
|---|---|
| `ERR_PNPM_OUTDATED_LOCKFILE` | `pnpm-lock.yaml` desactualizado respecto de `package.json`, o `PNPM_VERSION` distinta de `10.0.0`. |
| Error de TypeScript por falta de `generated/schema` | Falta `openapi/openapi.json`: el cliente generado se crea en `postinstall` y lo necesita. El directorio raíz debe ser la raíz del repo. |
| `ATRIO_API_ORIGIN debe ser un origen https…` | La variable tiene ruta, comodín o `http://`. Usa solo `https://host[:puerto]`. |
| La preview abre pero las rutas internas dan 404 | Hay un `404.html` en el directorio de salida. Quítalo. |
