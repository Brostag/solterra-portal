# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

**Regla rectora:** trabajar de forma quirúrgica. Primero medir, luego proponer,
luego implementar el cambio mínimo, después validar, y solo al final commitear
los archivos aprobados. No hacer cambios amplios, no rediseñar sin permiso, no
tocar lógica sensible sin aprobación, no ocultar riesgos.

---

## Cómo trabajas

No eres un ejecutor ciego. Si algo no aporta o rompe una decisión ya tomada,
dilo y propone la alternativa **antes** de ejecutar.

- **UI, copy y respuestas en español de Chile.**
- **Sin sycophancy.** Nada de "¡Excelente!" ni "¡Claro que sí!". Vas al punto.
- **Directo y conciso.** Respuesta = problema + solución concreta + siguiente paso.
- **Honesto sobre riesgos.** Si un cambio es peligroso o mala idea, dilo sin rodeos.
- **Desafía antes de ejecutar.** Si un cambio no aporta o hay una vía menos
  invasiva, plantéala primero.
- **No inventes.** Si no sabes un dato del proyecto, di "no tengo ese dato".
- Es un **proyecto de cliente**: cero notas internas o jerga personal en el repo.

---

## Modificación de esta guía

No modificar `CLAUDE.md` sin aprobación explícita del usuario. Si se propone
un cambio, entregar **primero** el diff sugerido o el bloque exacto, y esperar
aprobación antes de aplicarlo.

---

## Proyecto

**Solterra Portal**: aplicación web corporativa e interna para **Solterra
Movimiento de Tierra, Maquinarias y Equipos** (construcción, movimiento de
tierra e ingeniería, norte de Chile). Todo el contenido visible está en español.

Dos áreas:

- **Sitio público / marketing** — `/`, `/quienes-somos`, `/servicios`,
  `/experiencia`, `/contacto`. **No deben depender de sesión.**
- **Portal interno** (protegido por sesión y perfil) — dashboard, facturas,
  órdenes de compra, clientes, proveedores, productos, documentos, usuarios,
  auditoría, configuración de empresa.

---

## Stack

- **Next.js 15 App Router** + **TypeScript**
- **React Server Components** + **Server Actions**
- **Tailwind CSS**
- **Bun** (gestor y runtime)
- **Prisma** + **Supabase** (Auth, PostgreSQL, Storage si aplica)
- **Biome** es el formateador y linter del proyecto. Los scripts exactos que
  ejecuta `bun run lint` / `bun run format` se definen en `package.json`: esa
  es la fuente de verdad, no asumir.
- Generación de **PDF** (facturas y órdenes de compra)

---

## Comandos

```bash
bun dev          # Servidor local
bun run build    # Build de producción
bun run lint     # Lint + typecheck (ver package.json)
bun run format   # Formato (Biome)

# Producción local (para medir rendimiento REAL, no dev):
bun run build
bunx next start -p 3000

# Tunnel temporal para probar en celular:
cloudflared tunnel --url http://localhost:3000
```

`bunx next start -p 3000` **requiere `bun run build` previo**. No usarlo para
desarrollo activo: solo para validar rendimiento real.

No hay tests configurados aún.

---

## Despliegue

El proyecto se prepara para despliegue futuro en **Vercel**. Netlify pudo
evaluarse antes, pero las decisiones de performance, SSR, cache y App Router
deben pensarse principalmente para Vercel, salvo que el usuario indique otra
plataforma.

Cloudflare Tunnel se usa solo para pruebas temporales en celular: **no** es
entorno de producción ni referencia definitiva de rendimiento.

---

## Zonas protegidas — NO tocar sin aprobación explícita

Estas áreas no se modifican sin autorización directa. Si un cambio obliga a
tocarlas, **primero** explicar: (1) por qué es necesario, (2) riesgo,
(3) archivos exactos, (4) alternativa menos invasiva. Recién con el visto
bueno, ejecutar.

| Área | Qué incluye |
|------|-------------|
| **Config / secretos** | `.env`, `.env.local`, configuración Supabase y Prisma |
| **Base de datos** | `prisma/schema.prisma`, `prisma/migrations/**` |
| **Auth / seguridad** | `src/middleware.ts`, `src/lib/auth/**`, login, lógica de permisos |
| **API** | `src/app/api/**` |
| **Financiero** | Cálculos de facturas y órdenes de compra, IVA, totales |
| **PDF** | Rutas de PDF, diseño, cálculos, formato legal/visual |
| **UX/UI aprobada** | Layout, sidebar, topbar, formularios, tablas, cards, tamaños, diseño móvil/desktop |

Si se corrige un bug visual, el cambio debe ser **quirúrgico** y limitado al
componente afectado. No introducir paleta nueva ni rediseñar.

### Manejo de secretos

Nunca imprimir secretos completos en consola ni en respuestas. Si se revisan
variables de entorno, mostrar solo el nombre y redactar el valor:

```
DATABASE_URL=<REDACTED>
DIRECT_URL=<REDACTED>
```

### Auth y sesión (crítico — no simplificar)

- **`getSession()`** → debe seguir usando `supabase.auth.getUser()`. Se usa en
  rutas sensibles, API routes y actions. **No reemplazar por métodos inseguros.**
- **`getPortalSessionFast()`** → optimizado para páginas SSR del portal. **No
  usar en API routes ni actions sensibles. No usar para saltarse validaciones.**
- Regla: en páginas del portal se puede optimizar; en actions/API se mantiene
  validación segura siempre.

### Roles

Roles actuales conocidos: **Administrador**, **Supervisor**, **Usuario**.

No agregar, renombrar ni reinterpretar roles sin revisar el código y pedir
aprobación.

### Lógica financiera (Facturas y Órdenes de compra)

No tocar sin aprobación: subtotal/neto, descuento, IVA, total, estados,
creación, anulación, formato moneda, formato/diseño del PDF, y la lógica de
asociación con cliente/productos/proveedor.

### Cotizador — aislamiento explícito

El módulo `/cotizador` es una calculadora interna **referencial**, no es
factura ni OC. Reglas:

- Su lógica vive solo en `src/lib/cotizador.ts` (funciones puras) y
  `src/lib/pdf/cotizador-template.tsx`. **No importar** `calculateInvoiceTotals`
  ni `calculateOCTotals` desde el cotizador.
- El endpoint `/api/cotizador/pdf` re-ejecuta `calcularCotizacion()`
  server-side. Nunca aceptar totales pre-calculados del cliente.
- El PDF debe dejar visualmente claro que no es factura: banner
  "PRESUPUESTO REFERENCIAL — NO VÁLIDO COMO FACTURA", watermark
  "PRESUPUESTO" y nota legal final.

### Configuración de empresa

`/configuracion` define datos usados en documentos y PDFs. No tocar la lógica
de guardado sin aprobación. Debe quedar claro al usuario que: datos de empresa
y logo aparecen en PDFs, el contacto aparece en documentos, el IVA es el valor
por defecto, y los cambios aplican solo a documentos generados **después** de
guardar.

### Prisma / Supabase

Región actual de Supabase: `us-west-2` (Oregon, EE. UU.). Usuarios principales
esperados: Chile. Esto puede aumentar el TTFB por latencia. **No migrar región
sin medición real y sin un plan explícito de migración.**

Antes de optimizar a ciegas: medir → identificar la ruta lenta → revisar
queries → revisar cache → recién después proponer cambios de infraestructura.
No modificar `schema.prisma` ni migraciones sin aprobación.

---

## Uso de subagentes y skills

Claude Code tiene subagentes y skills. Úsalos cuando aporten una segunda
revisión especializada **real**, no por usarlos.

- **Delegar** en trabajo sensible o complejo: auditorías, performance,
  seguridad, arquitectura, base de datos, mobile/responsive, accesibilidad,
  bugs difíciles y revisión de diff/PR antes de commit.
- **No delegar** en cambios triviales: copy menor, una clase Tailwind, fix
  evidente de una línea — salvo que el riesgo sea alto.

### Qué capacidad preferir por tipo de problema

| Problema | Capacidad a preferir |
|---|---|
| Lentitud, TTFB, RSC payload, cache, latencia Supabase | performance / optimización |
| Queries, índices, N+1, schema, migraciones, pooling | base de datos / backend |
| Server Actions, API, validaciones, permisos, lógica financiera | backend / code review |
| Responsive, overflow, tablas/sidebar móvil, accesibilidad | frontend / mobile / a11y |
| Auth, middleware, secretos, service role, `.env` | seguridad / code review |
| Build roto, error TS, regresiones, QA Playwright | build / QA / e2e |
| Refactors grandes, estructura, estrategia de cache | arquitectura / planificación |
| Actualizar docs/`CLAUDE.md`, planes, aprendizajes | documentación |

Refiérete a la **capacidad**, no a un nombre fijo de agente: usa el subagente
que exista en este repo para esa capacidad; si no hay uno especializado,
resuélvelo directamente. Las reglas de zonas protegidas, aprobación previa y
entrega aplican igual cuando se delega.

### Protocolo de delegación

Identificar el problema → elegir la capacidad adecuada → pedir revisión
enfocada → consolidar hallazgos → proponer el cambio mínimo → aprobación si
toca zona protegida → implementar → validar → commit solo si el usuario aprueba.

Si se usó un subagente o skill, la entrega final debe indicar además **cuál
se usó y qué revisó** (sobre el formato normal de «Definición de terminado»).

---

## Arquitectura de rutas

**Públicas (sin sesión):** `/`, `/quienes-somos`, `/servicios`,
`/experiencia`, `/contacto`.

**Protegidas (sesión + perfil):** `/dashboard`, `/facturas`,
`/facturas/nueva`, `/facturas/[id]`, `/ordenes-compra`,
`/ordenes-compra/nueva`, `/ordenes-compra/[id]`, `/clientes`,
`/clientes/[id]`, `/productos`, `/proveedores`, `/proveedores/[id]`,
`/documentos`, `/configuracion`, `/usuarios`, `/usuarios/nuevo`, `/auditoria`.

---

## Identidad visual

- Azul Solterra: `#253158`
- Rojo Solterra: `#c6352e`
- Fondos claros: `#f6f7f9` cuando corresponda
- Usar clases Tailwind existentes del proyecto. No introducir paleta nueva sin
  aprobación.

---

## Performance

La app debe sentirse rápida. Prioridades:

- Navegación por sidebar fluida (estado activo, feedback instantáneo, soporte
  móvil, colapsado en desktop, prefetch de rutas internas). No reemplazar el
  comportamiento de navegación sin medir impacto.
- Para `<Link>` de navegación interna dentro de páginas del portal (filtros,
  CTAs "Nueva X", "Ver detalle"): usar `InstantLink` de
  `src/components/portal/InstantLink.tsx`. Replica el patrón del Sidebar
  (`prefetch` + `router.prefetch()` en hover/focus). Usar `prefetchOnMount`
  solo en filtros y CTAs primarios; en links de filas (50–200 por página)
  dejar solo hover/focus para no saturar la red.
- Evitar queries secuenciales innecesarias; usar `Promise.all` cuando sea seguro.
- Reducir payload con `select` explícito; no traer campos no usados.
- `/documentos` puede ser pesada por joins/volumen: `select` explícito, evitar
  `take` excesivo, no romper filtros ni la asociación con factura/cliente/
  proveedor/OC.
- Cache: ver sección **«Cache e invalidación»**.
- **No cambiar UX/UI para resolver performance salvo autorización.**

Para problemas de lentitud, preferir un subagente de performance **antes de
tocar código**, separando siempre: dev vs producción local; localhost vs
Cloudflare Tunnel; TTFB vs navegación client-side; queries Prisma vs payload
JS/RSC; latencia Supabase vs cache.

**Rutas a medir:** `/dashboard`, `/facturas`, `/clientes`, `/productos`,
`/proveedores`, `/ordenes-compra`, `/documentos`, `/configuracion`,
`/usuarios`, `/auditoria`.

**Métricas:** TTFB, tiempo de navegación por sidebar, carga directa (`goto`),
tamaño HTML/RSC, cantidad de queries, latencia Supabase, uso de cache,
full reload vs navegación client-side.

---

## Cache e invalidación

Todo uso de `unstable_cache` debe indicar:

1. qué dato se cachea,
2. TTL,
3. tag usado,
4. qué acción invalida ese tag (`revalidateTag` tras la mutación),
5. riesgo de datos stale.

**No cachear** datos sensibles, permisos, sesión crítica, ni información que
pueda exponer datos entre usuarios.

### Convenciones

- **Cada tag se exporta como constante** desde su archivo origen (ej.
  `DASHBOARD_STATS_TAG` en `dashboard/page.tsx`, `ACTIVE_CLIENTS_TAG` en
  `src/lib/cache/master-lists.ts`, `profileCacheTag(userId)` en
  `src/lib/auth/session.ts`). Las server actions importan la constante para
  evitar strings sueltos.
- **Listas con `searchParams` no se cachean** (cada combinación sería una
  entrada → cache explosion). Cachear solo:
  - listas sin filtros para selectores de formularios
  - counts globales que aparecen en headers
- **Convertir `Decimal` de Prisma a `number` dentro del callback del cache**
  (ej. `precio_unitario`) para serialización segura entre requests.
- El piso de TTFB del portal es `supabase.auth.getUser()` (~250–500 ms de
  network a Oregon). El cache de Prisma no lo reduce.

---

## Flujo de invitación de usuarios (no romper)

1. Admin crea/invita usuario.
2. Usuario recibe email.
3. Usuario acepta invitación.
4. Usuario llega a página para **crear contraseña**.
5. Usuario define contraseña.
6. Usuario puede iniciar sesión.

No debe redirigir a "recuperar contraseña" salvo que el flujo sea
explícitamente de recuperación. Cualquier cambio en usuarios valida: crear,
invitar, aceptar invitación, crear contraseña, editar, desactivar, login,
logout y rutas protegidas.

---

## Mobile

Debe funcionar bien en: 390x844, 430x932, 375x812, 414x896.

Validar: login, dashboard, facturas, nueva factura, órdenes de compra,
documentos, configuración, sidebar móvil, topbar móvil, formularios, tablas,
botones de acción. **No debe haber scroll horizontal** salvo en tablas donde
esté controlado intencionalmente.

---

## Git

- **Nunca `git add .`** Agregar archivos explícitamente:
  `git add "ruta/del/archivo.tsx"`.
- Antes de cada commit: `git status --short`, `git diff --stat`,
  `git diff --cached --stat`. Confirmar siempre qué está staged.
- **No commitear** archivos temporales: `PLAN_*.md`, `PERFORMANCE_*.md`,
  `*.png` de QA, screenshots, logs. Deben estar en `.gitignore` o fuera del
  staging.
- Los scripts `qa-*.mjs` (medición o Playwright) son **temporales**: no deben
  incluir secretos, no quedar staged, y eliminarse o quedar ignorados antes
  del commit.
- Mensajes de commit: inglés técnico breve, usando Conventional Commits
  (`fix:`, `style:`, `perf:`, `feat:`, `refactor:`).
  Ej.: `perf: prefetch sidebar nav routes on mount`,
  `fix: correct invited user password setup flow`.

---

## Definición de terminado (protocolo de entrega)

**QA mínimo siempre:** `bun run build` → `git status --short` →
`git diff --stat`.

Según el tipo de cambio, además:

- **UI** → revisar desktop + móvil 390x844 + móvil 430x932.
- **Auth** → probar login, logout, rutas protegidas, usuario sin sesión.
- **Performance** → medir antes/después, separar dev vs producción local
  (`bunx next start`), no confiar solo en Cloudflare Tunnel.
- **PDF** → descargar, imprimir, validar formato y totales.
- **Facturas u Órdenes de compra** → validar el ciclo completo: crear → ver →
  descargar PDF → imprimir → anular → filtrar por estado / marcar enviada →
  móvil → desktop.
- **Documentos** → upload, download, delete y permisos `canUpload`,
  `canDelete`, `canDeleteThis`; filtros y asociaciones intactos.

**Formato de respuesta tras implementar** (siempre):

1. Archivos modificados
2. Qué cambió
3. Qué NO se tocó
4. Resultado de `build`
5. QA realizado
6. `git diff --stat`
7. Subagente/skill usado y qué revisó (si aplica)
8. Si hubo commit: hash, mensaje y `git status` final

---

## Aprendizajes (log vivo)

```
### [Fecha]: [Título]
- Problema: [qué falló]
- Fix: [cómo se resolvió]
- Regla: [qué hacer distinto la próxima vez]
```

### 2026-05-18: Cache de perfil y dashboard stats (commit 2eecacf)
- Problema: TTFB ~1800 ms en todas las rutas del portal. Cada request
  ejecutaba `prisma.profile.findUnique` + las 9 queries del dashboard.
- Fix: `unstable_cache` con TTL 120 s sobre el perfil (tag
  `profileCacheTag(authUserId)`) en `src/lib/auth/session.ts`, y TTL 60 s
  sobre stats del dashboard (tag `dashboard-stats`). Invalidación con
  `revalidateTag` en server actions de facturas, OC, clientes y usuarios.
- Regla: el piso de TTFB es `supabase.auth.getUser()` (~250–500 ms a Oregon).
  No se reduce con cache de Prisma — bajarlo más requiere tocar middleware
  (zona protegida). Cualquier cache de perfil debe invalidarse al editar o
  desactivar usuario.

### 2026-05-18: Cache de listas maestras y bug productos (commit 67f5690)
- Problema: cada apertura de `/facturas/nueva` y `/ordenes-compra/nueva`
  re-ejecutaba `findMany` completo de clientes/productos/proveedores. Además
  `productos/actions.ts` no invalidaba `DASHBOARD_STATS_TAG`, dejando stale
  el contador de productos del dashboard hasta 60 s.
- Fix: nuevo `src/lib/cache/master-lists.ts` con 6 funciones cacheadas
  (3 selectores activos + 3 counts) y tags dedicados. `revalidateTag`
  añadido a las acciones de productos, clientes y proveedores.
- Regla: cachear solo listas SIN filtros. Las listas con `searchParams`
  (`/clientes?filtro=activos`) no se cachean — combinaciones infinitas.
  Decimal de Prisma → convertir a `number` dentro del callback del cache.

### 2026-05-18: Navegación interna fluida con InstantLink (commit 5913e2d)
- Problema: filtros de páginas y CTAs internos tardaban 200–500 ms (round-trip
  RSC), mientras el Sidebar navegaba en 40–50 ms. El `<Link prefetch>` por
  defecto en Next 15 solo prefetcha layout + loading.tsx, no el RSC payload.
- Fix: `src/components/portal/InstantLink.tsx` replica el patrón del Sidebar
  (`<Link prefetch>` + `router.prefetch()` en mount/hover/focus). Aplicado
  a las 8 páginas de lista del portal. Resultado: 36–61 ms en filtros y
  botones primarios.
- Regla: para `replace_all <Link → <InstantLink` cuidado con el espacio
  final. Mejor hacer Edits específicos o validar con `grep` después; un
  `<Linkhref=...` (sin espacio) no compila. `prefetchOnMount` solo en
  filtros y CTAs primarios; nunca en links de filas de tabla.

### 2026-05-18: Módulo Cotizador C1 — calculadora aislada (commit e8c98a1)
- Decisión: el cotizador es referencial, no tributario. Vive en
  `src/lib/cotizador.ts` (funciones puras) y NO comparte lógica con
  facturas/OC. Es Server Component + Client Form aislado.
- Convención: IVA se lee de `getCompanySettings()` (ya cacheado 300 s) con
  fallback 19. Solo CLP en C1. Resumen reactivo con `useMemo`. El botón
  "Calcular" solo enfoca el resumen — el cálculo es siempre en vivo.
- Regla: si en C2/C3 se persiste o convierte a factura/OC, mantener la
  separación: el cotizador puede leer datos compartidos (clientes, productos,
  config), pero su fórmula y su template PDF NUNCA se mezclan con los de
  facturación.

### 2026-05-18: Descarga PDF Cotizador + convenciones @react-pdf
- Decisión: endpoint `POST /api/cotizador/pdf` recibe el input crudo,
  re-ejecuta `calcularCotizacion()` server-side y genera el PDF. Nunca
  acepta totales pre-calculados del cliente — garantiza coherencia
  matemática entre resumen en pantalla y PDF.
- Convención técnica: templates PDF se escriben con `React.createElement`,
  NO con JSX. Bug conocido de `@react-pdf/reconciler` v0.23 con
  `react.transitional.element` de React 18.3 en dev. Aplicada a
  `invoice-template.tsx`, `purchase-order-template.tsx` y
  `cotizador-template.tsx`. No revertir a JSX.
- QA: el texto del PDF va embebido con font subsetting Unicode (CMap), no
  es inspeccionable con regex naive `(text) Tj`. Para validar contenido sin
  agregar deps de parser PDF: comparar tamaños entre inputs distintos
  como prueba de que el contenido refleja el input.

### 2026-05-18: Mediciones de performance — varianza alta
- Aprendizaje: `avg TTFB` es ruidoso entre corridas (cold start del server,
  carga del sistema). El `min TTFB` por ruta es más representativo del
  estado estable con cache caliente.
- Regla: para comparar antes/después, ejecutar `qa-g5-deep.mjs` (o el
  script de medición que aplique) al menos 2 veces seguidas — la segunda
  corrida tiene el cache caliente y resultados estables. El primer run
  tras `bunx next start` siempre paga cold start de unstable_cache.
