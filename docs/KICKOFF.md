# KICKOFF — Todo lo necesario para arrancar

Orden sugerido para las primeras 2 semanas. Lo marcado con ⏱ tarda días o semanas en aprobarse: empiézalo primero.

## 1. Asegurar el nombre "Atrio" (antes de invertir en marca)
- [ ] **Dominios:** `atrio.gt` o `atrio.com.gt` (los `.gt` los administra la Universidad del Valle de Guatemala), `atrioapp.com`, `getatrio.com`, `atrio.app`. `atrio.com` casi seguro está ocupado: no lo persigas. Subdominios previstos: `app.`, `pase.`, `api.`, `status.`.
- [ ] ⏱ **Marca:** búsqueda fonética y registro en el Registro de la Propiedad Intelectual (RPI) de Guatemala, clases de Niza **9** (software), **42** (SaaS) y **45** (servicios de seguridad); **36** cuando lleguen los pagos. Como "atrio" es palabra común, registrar **marca mixta (logo + palabra)**. Hacerlo con abogado de propiedad intelectual (ver `BRAND.md` 1.3).
- [ ] **Redes:** mismo handle en Instagram, Facebook, TikTok, LinkedIn y X (ej. `@atrioapp`); número de WhatsApp Business para soporte.
- [ ] **Prueba de pronunciación** con 10 personas, incluidos 2–3 guardias.
- [ ] Disponibilidad del nombre en App Store y Google Play (para Capacitor en Fase 1.5). Ya existe una app "Atrio" (EE. UU.): publicar como **"Atrio Residencial"**.

## 2. Legal, fiscal y negocio
- [ ] Figura legal (comerciante individual o sociedad), NIT, RTU en SAT y cuenta bancaria. Vas a necesitar emitir **tus propias facturas FEL** para cobrar a los residenciales.
- [ ] **Abogado:** términos de servicio, política de privacidad, contrato de encargado de tratamiento (DPA), aviso de privacidad para visitantes (pantalla y **cartel en garita** sobre el registro de documento); revisar defaults de `DECISIONS.md` Q-09 (retención), Q-15 (morosidad), Q-22 (recuperación de admin), **Q-27 (¿es lícito retener el DPI en garita?)**, **Q-28 (retención de documentos)**, **Q-34 (lista de restringidos)** y la validez de encuestas; cláusula de que el sistema **no sustituye** la seguridad física.
- [ ] **Contador:** retención financiera (Q-17), régimen tributario, FEL.
- [ ] Contrato modelo con residenciales (SaaS + SLA + DPA) y acuerdo de piloto con socios de diseño.

## 3. Cuentas y servicios (MFA en todas)
| Servicio | Para qué | Cuándo |
|---|---|---|
| Gestor de contraseñas (Bitwarden, 1Password) | Todas las credenciales del proyecto | Día 1 |
| 2 llaves de seguridad FIDO2 | Root de AWS, GitHub, Cloudflare, registrador, email | Día 1 |
| Dominio + email del dominio | Identidad, remitente de correos (SPF/DKIM/DMARC) | Día 1 |
| GitHub (repos `backend` y `frontend`) + GitHub Copilot con agente en la nube | Código y agentes | Día 1 |
| Cloudflare | DNS, Pages (previews por PR), WAF, Turnstile | Día 1 |
| AWS (Organizations: `management`, `nonprod`, `prod`; IAM Identity Center; **alertas de presupuesto**) | Infraestructura | Semana 1 |
| ⏱ Meta Business Manager + **verificación de empresa** + WhatsApp Business Platform (Cloud API) + plantillas | OTP y avisos por WhatsApp | Semana 1 (requiere datos de la empresa y un sitio web) |
| Twilio | SMS de respaldo (verificar entrega con Tigo y Claro) | Semana 2 |
| ⏱ Amazon SES (solicitar salida del sandbox) | Email | Semana 2 |
| Sentry, Grafana Cloud | Errores y observabilidad | M0 |
| Apple Developer y Google Play | Apps con Capacitor | Fase 1.5 |
| Pentester externo | Pentest antes del piloto | Cotizar en M4, ejecutar en M6 |

## 4. Preparar los repositorios (día 1–2)

Tienes dos repos: `backend` y `frontend`. En lo que sigue, `JavierGrajeda8/atrio-backend` y `JavierGrajeda8/atrio-frontend` son sus nombres reales.

1. **Copiar los kits.** El contenido de `atrio-backend-kit` va a la raíz del repo backend y el de `atrio-frontend-kit` a la raíz del frontend. Haz este primer commit directo a `main`, antes de activar la protección.
2. **Abrir ambos en VS Code.** Clona los dos repos lado a lado y abre `backend/atrio.code-workspace` (*File › Open Workspace from File*). Así el agente de VS Code ve los dos repos. Si tus carpetas no se llaman `backend` y `frontend`, ajusta las rutas en ese archivo.
```
atrio/
├─ backend/     ← contiene atrio.code-workspace
└─ frontend/
```
3. **Extensiones:** GitHub Copilot Chat (actualizada) y GitHub Pull Requests. En el chat deben aparecer los agentes `planificador-backend`, `revisor-backend`, `planificador-frontend` y `revisor-frontend`, y los comandos `/revisar-spec`, `/be-…` y `/fe-…` (ver §5). La primera vez que el chat use el servidor MCP de GitHub (`.vscode/mcp.json`) te pedirá autorizar.
4. **Configurar cada repo** (repite en los dos):
   - Ruleset en `main`: PR obligatorio, 1 aprobación, historial lineal, sin force-push. Los checks obligatorios se agregan cuando el CI exista (primer issue de M0a).
   - Copilot cloud agent habilitado para el repo, y verifica que tu plan lo incluya y cuánto consume.
   - Dependabot activado.
   - Entornos `staging` (automático) y `production` (aprobación obligatoria tuya).
5. **Etiquetas y milestones** en ambos repos, con la CLI de GitHub:
```bash
for r in JavierGrajeda8/atrio-backend JavierGrajeda8/atrio-frontend; do
  for l in "agent:ready:0E8A16" "agent:in-progress:FBCA04" "needs-decision:D93F0B" \
           "needs-human-review:5319E7" "needs-api:C5DEF5" "breaking-api:B60205" \
           "blocked:B60205" "security-critical:B60205" "sync:EDEDED" \
           "type:feature:C2E0C6" "type:bug:D73A4A" "type:chore:EDEDED"; do
    gh label create "${l%:*}" --color "${l##*:}" --force --repo "$r"
  done
  for m in "M0a — Cimientos locales" "M0b — Staging" "M1 — Identidad y estructura" \
           "M2 — Accesos" "M3 — Garita offline" "M4 — Notificaciones y visitas sin pase" \
           "M5 — Dashboard y ciclos de vida" "M6 — Endurecimiento y piloto"; do
    gh api "repos/$r/milestones" -f title="$m" >/dev/null
  done
done
```
6. **Conectar los repos:**
   - Crea un token *fine-grained* con acceso **solo** al repo frontend (permisos: Contents y Pull requests en lectura/escritura). Guárdalo en el backend como secreto `FRONTEND_SYNC_TOKEN` y crea la variable `FRONTEND_REPO` = `JavierGrajeda8/atrio-frontend` (*Settings › Secrets and variables › Actions*).
   - Cuando el backend publique su imagen en GHCR (issue BE-10), da acceso de lectura al repo frontend desde la configuración del paquete, para que el E2E pueda descargarla.
7. **Variables para el agente en la nube (backend):** en la configuración de Copilot del repo (variables del entorno de agentes), crea `TEST_DATABASE_URL` = `postgresql://atrio:atrio_dev_only@localhost:5432/atrio`, que apunta al PostgreSQL que levanta `copilot-setup-steps.yml`. Son credenciales solo de prueba.
8. **Probar la base:** en *Actions* de cada repo corre a mano **Copilot Setup Steps**, que debe terminar en verde aunque el repo esté vacío. En el backend corre **Sync to frontend**: debe terminar en verde. Como el frontend ya trae una copia de `docs/`, no abrirá PR hasta que algo cambie; pruébalo editando una línea de `docs/DECISIONS.md` en el backend.

## 5. Operar el pipeline con Copilot

### Dos modos, dos usos
| Modo | Dónde | Úsalo para |
|---|---|---|
| **Modo agente (local)** | Chat de VS Code, con el workspace abierto; tú presente | M0a completo, todo lo crítico de seguridad (autenticación, firma del QR, RLS, permisos, dinero), depurar, cosas que tocan ambos repos |
| **Agente en la nube** | Asignar el issue a Copilot en GitHub (o delegarlo desde VS Code) | Issues rutinarios y bien especificados; 2–3 en paralelo como máximo |

Usa el modelo más capaz de tu plan para M0a y para lo crítico, y uno más económico para lo rutinario.

### El ciclo
```text
 /revisar-spec ──▶ issues needs-decision ──▶ respondes en backend/docs/DECISIONS.md ──▶ sync al frontend
       │
       ▼
 /be-planificar · /fe-planificar ──▶ tú apruebas la lista ──▶ issues agent:ready
       │
       ▼
 /be-implementar · /fe-implementar  ó  asignar a Copilot (nube) ──▶ PR + preview
       │
       ▼
 /be-revisar-pr · /fe-revisar-pr (chat NUEVO) ──▶ hallazgos + pruebas negativas
       │
       ▼
 TÚ: lees, pruebas el preview, merge ──▶ backend: sync PR al frontend ──▶ se desbloquean los [UI]
```

### Comandos (archivos en `.github/prompts/` de cada repo)
Los agentes y comandos llevan el nombre del repo para que no se confundan con el workspace abierto.

| Backend | Frontend | Agente | Para qué |
|---|---|---|---|
| `/revisar-spec` | — | modo agente | Una vez antes de M0a: contradicciones, huecos y preguntas de negocio como issues `needs-decision` |
| `/be-planificar` | `/fe-planificar` | `planificador-backend` / `planificador-frontend` | Convierte el backlog del milestone (para M0: `docs/plans/M0-backlog.md`) en issues; primero te muestra la lista |
| `/be-implementar` | `/fe-implementar` | modo agente | Plan corto en el issue → código → pruebas → PR con la plantilla |
| `/be-revisar-pr` | `/fe-revisar-pr` | `revisor-backend` / `revisor-frontend` | Revisión QA independiente (en un chat nuevo); agrega pruebas; no aprueba ni fusiona |
| `/be-desatascar` | `/fe-desatascar` | modo agente | Propone 2 enfoques para un issue `blocked` |

Al asignar un issue al agente en la nube puedes elegir un agente personalizado en el menú; para construir usa el agente por defecto.

### Reglas prácticas
- **Lee línea por línea los primeros 3–5 PRs de cada repo**: fijan los patrones que Copilot va a copiar.
- **Siempre lees tú** lo que toque autenticación, firma de QR, RLS, permisos o dinero (etiqueta `security-critical`).
- **Cuando Copilot repita un error, agrega una regla** al `AGENTS.md` o al `.instructions.md` que corresponda. El pipeline mejora solo.
- **El revisor nunca es la misma sesión que construyó.** Abre un chat nuevo para `/be-revisar-pr` o `/fe-revisar-pr`.
- **Issue grande = PR malo.** Si un PR pasa de ~400 líneas, cierra y divide el issue.
- Responde `needs-decision` dos veces por semana y haz una retro semanal de 15 minutos.
- Vigila el consumo de Copilot la primera semana: el modo agente y el agente en la nube consumen bastante más que el chat.

## 6. Piloto
- [ ] 1–2 residenciales socios (ideal: uno de 30–80 casas y una torre).
- [ ] Visita a la garita: señal celular (Tigo/Claro), ubicación del dispositivo, iluminación, toma eléctrica.
- [ ] Dispositivo de garita: Android de gama media-baja con buena cámara, soporte fijo, cargador y SIM de un operador distinto al internet del residencial.
- [ ] Capacitación: video de 2 min + 20 min en persona con cada turno.
- [ ] Criterios de éxito (SPEC §17): activación < 2 h, ≥ 70 % de unidades a 30 días, < 2 % de accesos manuales, mediana < 60 s para autorizar visitas sin pase, 0 incidentes de seguridad.
- [ ] Canal de soporte del piloto (WhatsApp) y reporte semanal al socio.

## 7. Presupuesto de arranque (orden de magnitud; verificar precios vigentes)
| Rubro | Estimado |
|---|---|
| GitHub Copilot | Plan que incluya el agente en la nube; facturación por uso: vigila el consumo la primera semana |
| Infraestructura en desarrollo (local + staging) | US$60–120 / mes |
| Infraestructura de producción, etapa A (desde el piloto) | US$200–365 / mes |
| Dominio + email | US$10–20 / mes |
| Llaves FIDO2 (2) | ≈ US$100, una vez |
| Mensajería (WhatsApp/SMS) en piloto | US$20–50 / mes |
| Dispositivo de garita (por garita) | Gama media-baja; cotizar localmente |
| Logo profesional, abogado, contador, registro de marca, pentest | Cotizar |

## 8. Listo para empezar M0a cuando…
- [ ] Los dos repos tienen su kit, ruleset, etiquetas, milestones y entornos.
- [ ] El workspace multi-root abre ambos repos y el chat muestra los agentes y comandos.
- [ ] `FRONTEND_SYNC_TOKEN` y `FRONTEND_REPO` están configurados y el primer PR de sincronización llegó al frontend.
- [ ] Copilot Setup Steps corre en verde en ambos repos.
- [ ] Tienes gestor de contraseñas y llaves FIDO2 en GitHub.
- [ ] Corriste `/revisar-spec` y respondiste sus preguntas.
- [ ] M0a está planificado con `/be-planificar` y `/fe-planificar` y aprobaste las listas.

M0b además necesita: cuentas AWS con alertas de presupuesto, Cloudflare con el dominio y la verificación de Meta en curso. La búsqueda de marca y el dominio no bloquean M0a.
