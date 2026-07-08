# Diseño de la capa offline del portal — Fase 5

> **Estado:** documento de diseño (solo lectura). No hay código de producción escrito.
> **Objetivo:** que los operadores de terreno (Operación y Mantención) puedan
> llenar sus formularios sin conexión estable y que los datos se sincronicen
> solos al recuperar red, sin perder registros ni duplicarlos.
> **Alcance v1:** solo **creación** de documentos de terreno. Editar offline
> queda **fuera** de esta versión.

Este diseño está partido en **3 niveles incrementales e independientes**. Cada
nivel entrega valor por sí solo y se puede desplegar y demostrar al cliente sin
esperar al siguiente:

| Nivel | Qué resuelve | Riesgo | Sirve solo |
|-------|--------------|--------|-----------|
| **1. Borradores** | No perder lo escrito si se cierra la app o falla el envío | Bajo | Sí |
| **2. Outbox + sync** | Guardar sin señal y sincronizar solo al volver la red | Medio | Sí |
| **3. PWA (Serwist)** | Abrir la app y sus catálogos aunque no haya red | Medio | Sí |

Nada de esto toca el módulo Comercial (facturas, OC, cotizador, contratos) ni
sus PDF. Toda la lógica offline vive en el grupo de rutas `(operativo)`
(`/operacion`, `/mantencion`).

---

## 1. Inventario: los formularios de terreno

Se analizó el código real. Los formularios de operador que crean documentos son
componentes de cliente (`"use client"`), todos comparten estilos vía
`src/lib/terreno/form-styles.ts` (`inputCls`, `labelCls`, `valorBtnCls`) y
`src/lib/terreno/format.ts`, y **todos** envían con el mismo patrón:
`useTransition()` + llamada directa a un Server Action (no usan `fetch`, no
usan `useActionState`).

### Los 4 formularios en alcance offline (create-only)

| # | Formulario | Componente | Server Action | Tabla | ¿Correlativo? |
|---|-----------|-----------|---------------|-------|---------------|
| 1 | **Checklist de Mantención** (83 ítems) | `ChecklistMantForm.tsx` | `createChecklistMantencion` | `mant_checklists_mantencion` | **SÍ** (server) |
| 2 | **Parte Diario / Registro ingreso-salida** | `ParteForm.tsx` | `createParte` | `mant_partes_diarios` | No (UUID) |
| 3 | **Checklist de Operación** (15 ítems) | `ChecklistForm.tsx` | `createChecklist` | `mant_checklists` | No (UUID) |
| 4 | *(igual que #2)* Registro ingreso/salida | `ParteForm.tsx` | `createParte` | `mant_partes_diarios` | No (UUID) |

**Hallazgo clave 1 — "Parte diario" y "Registro ingreso/salida" son el mismo
modelo.** En el código, el registro de ingreso/salida **reemplazó** al parte
diario: ambos son `MantParteDiario` (tabla `mant_partes_diarios`) y se crean con
`createParte`. Para efectos de sync son **un solo tipo de documento**. Eso deja
**3 tipos reales de documento** en alcance, no 4.

**Hallazgo clave 2 — solo 1 de los 4 formularios genera correlativo.** Únicamente
el Checklist de Mantención lleva número correlativo asignado por el servidor
(índice único `@@unique([correlativo, anio])`). El Parte/Registro y el Checklist
de Operación usan **solo UUID** (`id String @id @default(uuid())`), sin número
secuencial. Esto simplifica enormemente el diseño: **el problema del "correlativo
diferido" afecta a un solo formulario.**

**Hallazgo clave 3 — hoy ningún formulario en alcance sube fotos.** Los esquemas
Prisma tienen columnas `fotos_entrada`, `fotos_salida`, `fotos_tablero`,
`firma_*_b64`, pero los formularios actuales **no las llenan** (no hay
`file_upload` ni captura de firma en `ParteForm`/`ChecklistMantForm`). Ver
§5 para la decisión de producto sobre fotos.

### Datos que envía cada formulario

**1. Checklist de Mantención — `ChecklistMantInput`**
```
equipo_id, responsable_id, fecha (YYYY-MM-DD), tipo_mantencion,
km, horometro, proxima_mantencion, observaciones_generales,
items: {
  seccion_a: Record<clave, { valor: "SI"|"NO"|"NA"|null, obs: string|null }>,  // 33
  seccion_b: Record<clave, { valor: "SI"|"NO"|"NA"|null, obs: string|null }>,  // 50
  seccion_c: string[]   // correctivas libres
}
```
Correlativo server-side; snapshots de patente/km/horómetro del equipo; guarda
`items` como JSON. Permiso: `MANTENCION` + rol `ADMINISTRADOR`/`SUPERVISOR`.

**2/4. Parte Diario / Registro — `RegistroInput`**
```
equipo_id, operador_id, fecha, fecha_salida, estado,
area_uso, centro_costo, tipo_mantencion, combustible_fraccion,
nombre_responsable, rut_responsable, nombre_receptor, rut_receptor,
horometro, odometro, observaciones,
componentes: Record<17 claves, { ingreso, salida, obs_i, obs_s }>   // JSON
```
Sin correlativo. Permiso: `OPERACION` (cualquier rol del área).

**3. Checklist de Operación — `ChecklistInput`**
```
equipo_id, operador_id, observaciones,
items: Record<15 claves, boolean>   // true = OK, false = falla
```
Sin correlativo. `estado_general` ("Apto"/"No Apto") se recalcula en el server.
Permiso: `OPERACION`.

### Catálogos que consumen (dropdowns)

| Catálogo | Función (`src/lib/terreno/queries.ts`) | Tag cache | Forma |
|----------|----------------------------------------|-----------|-------|
| Equipos | `getEquiposOptions()` / `getEquipos()` | `MANT_EQUIPOS_TAG` (60 s) | `{ id, codigo, nombre }` (+detalle) |
| Responsables / operadores | `getResponsables()` | `MANT_RESPONSABLES_TAG` (120 s) | `{ id, nombre }` |
| Área de uso, centro de costo, tipo mantención | — | — | **texto libre** (no hay tabla) |

Los tres catálogos con datos vienen de la BD vía `unstable_cache`. Área de uso /
centro de costo / tipo de mantención hoy son **input de texto libre**, no
requieren estar en línea.

### Contexto técnico relevante

- **Correlativo (patrón existente, a reutilizar tal cual).** En
  `createChecklistMantencion`:
  ```
  const anio = fecha.getUTCFullYear();
  for (let intento = 0; intento < 4 && !nuevo; intento++) {
    const correlativo = await nextCorrelativoChecklistMant(anio); // aggregate _max + 1
    try {
      nuevo = await prisma.mantChecklistMantencion.create({ data: { correlativo, anio, ... } });
    } catch (e) {
      if (esCodigo(e, "P2002")) continue;   // carrera de correlativo → reintenta
      if (esCodigo(e, "P2003")) return { error: "El equipo o el encargado no existe." };
      return { error: "No se pudo guardar el check list." };
    }
  }
  ```
  `nextCorrelativoChecklistMant(anio)` = `aggregate({ _max: { correlativo }, where: { anio } })` `+ 1`.
- **Auth.** `getSession()` usa `supabase.auth.getUser()` (validación fuerte, para
  actions/API); `getPortalSessionFast()` usa `getSession()` de cookie (para
  páginas SSR). `@supabase/ssr` **refresca el token automáticamente** al llamar
  `getUser()`/`getSession()` si el access token venció pero el refresh token
  sigue válido.
- **Sin nada offline hoy.** No existe Dexie/IndexedDB/idb en el repo; solo
  `localStorage` para tema y sidebar. Partimos de cero, sin conflictos.
- **Stack:** Next 15.3.7 (App Router), React 18.3.1, Bun, Zod 3.25, Vercel
  (región `pdx1`). No hay Serwist, next-pwa, dexie ni uuid instalados.

---

## 2. Nivel 1 — Borradores persistentes (autosave + "continuar borrador")

**Qué resuelve:** hoy, si el operador cierra la pestaña, se le agota la batería o
el envío falla, **pierde todo lo escrito**. El Nivel 1 guarda el borrador en el
dispositivo mientras escribe y ofrece retomarlo. Es puramente local; **no toca el
servidor ni la lógica de guardado**.

### Dónde engancha en cada formulario

Los 4 formularios comparten estilos, pero **no comparten forma de estado**:

| Formulario | Estado a persistir | Cómo se lee |
|-----------|--------------------|-------------|
| `ChecklistMantForm` | `FormData` (escalares) + `secA`/`secB`/`correctivas` (useState) | mixto |
| `ParteForm` | `FormData` (escalares) + `comp` (useState) | mixto |
| `ChecklistForm` | todo `useState` (`equipoId`, `operadorId`, `items`, `observaciones`) | controlado |

Como el estado es heterogéneo, **un autosave "mágico" a nivel de `<form>` no
sirve** (un `new FormData(form)` no captura los `useState` de SÍ/NO/NA ni los
ítems booleanos). El diseño correcto es un **hook `useDraft` común** que aporta la
parte compartida (persistencia, debounce, expiración, restaurar, limpiar) y
recibe de cada formulario dos funciones pequeñas (`buildSnapshot()` /
`applySnapshot()`) que sí son específicas.

**Contrato del hook (compartido, ~1 archivo):**
```
useDraft<TSnapshot>({
  formType,                 // "checklist-mant" | "parte" | "checklist-op"
  draftKey,                 // estable por sesión de captura (p.ej. formType + equipo_id, o "nuevo")
  buildSnapshot: () => TSnapshot,   // lo aporta cada form (10-15 líneas)
  applySnapshot: (s) => void,       // lo aporta cada form
  debounceMs: 800,
})
→ { restored, hasDraft, clearDraft, savedAt }
```
Comportamiento:
- **Escribir:** en cada cambio, con debounce 800 ms, serializa `buildSnapshot()`
  y hace `put` en Dexie.
- **Restaurar:** al montar, si hay borrador para ese `formType`, muestra un aviso
  no intrusivo *"Tienes un borrador sin enviar de las HH:MM — [Retomar] [Descartar]"*.
- **Limpiar:** al **enviar con éxito** (o al pasar al outbox en Nivel 2), borra el
  borrador. Un borrador es "trabajo en curso", no "documento guardado".

Enganche por formulario (esfuerzo bajo, aditivo): añadir el `import`, dos
funciones y una línea de aviso de restauración. **No se altera el submit actual.**

### Esquema de la tabla Dexie

```
// db: "solterra-terreno", version 1
drafts: {
  id: string,          // `${formType}:${draftKey}`  (clave primaria)
  formType: string,    // índice
  payload: object,     // snapshot serializable del form
  updatedAt: number,   // epoch ms — índice, para expiración
  userId: string,      // por si cambia de usuario en el mismo equipo
}
// índices: &id, formType, updatedAt
```

### Política de expiración

- Un borrador vive máximo **7 días** desde `updatedAt`.
- Al abrir cualquier formulario de terreno, un barrido borra los borradores con
  `updatedAt` mayor a 7 días (evita acumulación en el dispositivo).
- Al enviar con éxito, se borra de inmediato (no espera a los 7 días).
- Solo se ofrece restaurar el borrador **del mismo `userId`** (equipos
  compartidos entre operadores).

### Estimación de esfuerzo

**~2–3 días.** Incluye: dependencia `dexie`, definición de la base, hook
`useDraft`, cableado de los 3 formularios (Parte/Registro es uno solo), el aviso
de restauración con estilos del proyecto y el barrido de expiración. Riesgo bajo:
no hay servidor involucrado y es 100 % aditivo.

**Qué se demuestra al cliente:** llenar medio checklist, cerrar la app a la fuerza,
reabrir y ver el aviso *"Tienes un borrador sin enviar"* → retomar exactamente
donde iba.

---

## 3. Nivel 2 — Outbox offline + endpoint de sync idempotente

**Qué resuelve:** el operador **guarda sin señal**. El documento queda en una cola
local ("outbox") y se **envía solo** al recuperar red, sin duplicados. Es el
nivel de mayor valor y el más delicado.

### 3.1 ¿Route Handler o Server Action? → Route Handler

**Decisión: un Route Handler `POST /api/terreno/sync`, no un Server Action.**
Justificación (los Server Actions son excelentes para el flujo online actual,
pero no para drenar una cola en background):

1. **Se invoca con `fetch` explícito.** El drainer del outbox necesita llamar al
   endpoint por su cuenta, con su propio `AbortController`, reintentos y control
   de headers. Los Server Actions se invocan por el protocolo RSC con un
   *action-id* cifrado atado al render; no están pensados para llamarse desde un
   worker/drainer.
2. **Semántica HTTP real.** Necesitamos distinguir `200` (ok), `207` (lote
   parcial), `401` (sesión vencida → retener), `422` (rechazo de validación →
   corregir). Un Route Handler devuelve status codes; un Server Action devuelve un
   objeto y mezcla el canal de error con el de redirect.
3. **Idempotencia y batching de primera clase.** El endpoint recibe un lote de N
   documentos con sus UUID de cliente y responde por cada uno. Es más natural en
   un handler REST.
4. **Reutiliza la misma capa.** El handler llama a las **mismas** funciones que
   hoy usan los actions (`getSession`, `requireModule`/`canAccessModule`,
   `nextCorrelativoChecklistMant`, el mismo `prisma.create`). No se duplica lógica
   de negocio: se extrae la parte de "crear documento" a una función compartida
   que hoy vive dentro del action y mañana la usan action **y** handler.

> Los Server Actions actuales **se mantienen** para el camino online (sin
> regresión). El handler es el camino offline. Ambos comparten el core.

### 3.2 Contrato request/response

**Request — `POST /api/terreno/sync`** (cookie de sesión Supabase incluida):
```
{
  items: [
    {
      clientId: "uuid-v4",            // generado en el dispositivo = futuro id de la fila
      type: "checklist-mant" | "parte" | "checklist-op",
      createdAtClient: 1720300000000, // epoch, para orden y auditoría
      payload: { ...ChecklistMantInput | RegistroInput | ChecklistInput }
    },
    ...  // lote de hasta ~25
  ]
}
```

**Response — `200` / `207`:**
```
{
  results: [
    { clientId: "uuid", status: "synced",   serverId: "uuid", correlativo: 42, anio: 2026 },
    { clientId: "uuid", status: "duplicate", serverId: "uuid" },      // ya estaba (idempotente)
    { clientId: "uuid", status: "rejected",  code: "VALIDATION", errors: {...} },
    { clientId: "uuid", status: "retry",     code: "SERVER" }         // error transitorio, reintentar
  ]
}
```
- `200` si todos `synced`/`duplicate`; `207` si hay mezcla; `401` si no hay
  sesión válida (el cuerpo no importa, el drainer retiene el lote completo).

### 3.3 Idempotencia — el UUID de cliente es el `id` de la fila

Las 3 tablas usan `id String @id @default(uuid())`. Aprovechamos eso: **el
cliente genera el UUID y se guarda como `id` definitivo de la fila.** El sync es
un `create` con `id` explícito → idempotente por construcción:

- **Parte/Registro y Checklist de Operación** (sin correlativo):
  `prisma.create({ data: { id: clientId, ...payload } })`.
  Si vuelve `P2002` con `target = ['id']` → **el documento ya se sincronizó**
  (reintento del drainer) → responder `duplicate` con ese `serverId`. Cero
  duplicados.

- **Checklist de Mantención** (con correlativo): mismo `id: clientId`, pero el
  correlativo se asigna **en el servidor al sincronizar**, reutilizando el bucle
  existente. La única sutileza es **desambiguar el `P2002`** por
  `error.meta.target`:
  ```
  catch P2002:
    if target incluye "id"                    → duplicate (ya sincronizado)
    if target = ["correlativo","anio"]        → continue (carrera de correlativo, reintenta)
  ```
  Esto es una extensión mínima del `try/catch` que ya existe.

> El correlativo **nunca** viaja desde el cliente. El documento local vive sin
> número; el número aparece recién en la respuesta de sync. Ver §5.

### 3.4 Manejo de token expirado (refresh antes de drenar, retención si falla)

El drainer, antes de enviar el lote, y el handler, al recibirlo, dependen de la
sesión Supabase en cookie. `@supabase/ssr` refresca el access token
automáticamente al llamar `getUser()`:

1. El handler llama `getSession()` (que hace `supabase.auth.getUser()`).
   - Access token vencido + refresh token válido → **se refresca solo**, sigue.
   - Refresh token vencido (offline prolongado) → `user = null` → responde
     **`401`**.
2. Ante `401`, el drainer **detiene el drenado y NO descarta nada**. Marca el
   estado global como *"Sesión expirada — inicia sesión para sincronizar N
   registros"* y reintenta tras el próximo login exitoso.
3. El outbox **jamás borra un ítem por falta de sesión**. Solo se borra cuando el
   servidor confirma `synced` o `duplicate`.

### 3.5 Esquema de la cola en Dexie

```
// misma base "solterra-terreno", version 2 (aditivo sobre Nivel 1)
outbox: {
  clientId: string,     // uuid-v4 (clave primaria) = futuro id de la fila
  type: string,         // "checklist-mant" | "parte" | "checklist-op"  — índice
  payload: object,      // el *Input serializado
  status: string,       // "pending" | "syncing" | "synced" | "error" | "rejected" — índice
  createdAtClient: number,
  attempts: number,     // para backoff
  lastError: string | null,
  serverId: string | null,      // se llena al sincronizar
  correlativo: number | null,   // se llena al sincronizar (solo checklist-mant)
}
// índices: &clientId, type, status, createdAtClient
```

### 3.6 El drainer (cliente)

- Se dispara: al **recuperar conexión** (`window.online`), al **volver la
  pestaña a foco**, y con un intervalo suave mientras hay ítems `pending`
  (reutilizando el patrón `AutoRefresh` ya existente en las listas).
- Toma ítems `pending` en lotes de ~25 ordenados por `createdAtClient`.
- Marca `syncing`, hace `POST /api/terreno/sync`, y según cada resultado:
  `synced`/`duplicate` → borra el ítem (y refresca la lista); `retry` → vuelve a
  `pending` con backoff exponencial sobre `attempts`; `rejected` → `rejected`
  (flujo de corrección, §3.8).
- **Un solo drainer activo a la vez** (lock en memoria) para no enviar el mismo
  lote dos veces; de todos modos la idempotencia por `id` lo cubre.

### 3.7 Estados visibles en la UI

Estados por documento y un indicador global, con la paleta del proyecto
(azul `#253158`, rojo `#c6352e`):

| Estado | Chip | Significado para el operador |
|--------|------|------------------------------|
| `pending` | 🟡 **Pendiente de sincronización** | Guardado en el dispositivo, esperando red |
| `syncing` | 🔵 **Sincronizando…** | Enviándose ahora |
| `synced` | 🟢 **Sincronizado** (+ N.º correlativo si aplica) | Confirmado por el servidor |
| `error`/`retry` | 🟠 **Reintentando** | Falla transitoria, se reintenta solo |
| `rejected` | 🔴 **Requiere corrección** | El servidor lo rechazó por validación |

Indicador global en el header de terreno: *"⬆ 3 registros por sincronizar"* /
*"✓ Todo sincronizado"* / *"⚠ Sesión expirada — inicia sesión"*.

### 3.8 Si el servidor rechaza un documento (validación) — flujo de corrección

Un `rejected` (`422`, código `VALIDATION`) significa que el payload es inválido
para el servidor (p. ej. `equipo_id` ya no existe — `P2003`, o falta un campo
requerido). Diseño del flujo:

1. El ítem queda `rejected` en el outbox (no se borra, no se reintenta en ciego).
2. En la lista aparece con chip 🔴 **"Requiere corrección"** y el motivo.
3. Al tocarlo, se **reabre el formulario precargado con el payload del outbox**
   (usando el mismo `applySnapshot` del Nivel 1) más el mensaje de error del
   servidor destacado.
4. El operador corrige y reenvía: se actualiza el mismo ítem del outbox
   (**mismo `clientId`**, se mantiene la idempotencia) y vuelve a `pending`.
5. Si el rechazo es irrecuperable (equipo borrado), se ofrece **descartar** el
   ítem explícitamente (acción manual, nunca automática).

### Estimación de esfuerzo

**~5–8 días** (el nivel más grande). Incluye: extraer el core de creación desde
los actions a funciones compartidas; el Route Handler con validación Zod,
permisos y correlativo/idempotencia; la tabla outbox y el drainer con backoff;
el camino "guardar offline" en los 3 formularios; los chips de estado; el
indicador global; y el flujo de corrección. Riesgo medio: toca auth (solo
lectura de sesión, sin cambiar `getSession`), toca API (ruta nueva, no modifica
las existentes) y reutiliza la lógica financiera/correlativo sin alterarla —
**todas zonas protegidas: requiere aprobación antes de implementar.**

**Qué se demuestra:** modo avión → llenar y "guardar" un checklist y un parte →
ver ambos como 🟡 Pendiente → reactivar red → verlos pasar a 🔵 y luego 🟢, el
checklist de mantención con su número correlativo recién asignado. Reintentar el
envío dos veces (simulado) y comprobar que **no se duplican**.

---

## 4. Nivel 3 — PWA con Serwist (app y catálogos disponibles sin red)

**Qué resuelve:** hoy, sin red, la app **ni siquiera abre**. El Nivel 3 permite
abrir `/operacion` y `/mantencion` offline, con los catálogos (equipos,
responsables) ya disponibles para llenar los formularios.

### 4.1 Setup de Serwist en Next 15

`serwist` + `@serwist/next` es el sucesor mantenido de `next-pwa` y es el
recomendado para App Router. Setup (aditivo):

1. `bun add -d @serwist/next` y `bun add serwist`.
2. `next.config.ts`: envolver con `withSerwist({ swSrc: "src/app/sw.ts", swDest: "public/sw.js" })`.
   Se conserva todo lo actual (`serverExternalPackages`, headers, `images`).
3. `src/app/sw.ts`: service worker declarativo de Serwist con `defaultCache`.
4. `public/manifest.webmanifest`: nombre "Solterra", `start_url: "/operacion"`,
   `display: "standalone"`, `theme_color: "#253158"`, íconos 192/512
   (hay que generar `icon-192.png` / `icon-512.png` desde el logo). Ya existe una
   plantilla de manifest en la sub-app `solterra-manteniemiento/` que sirve de
   referencia (ajustando colores a la paleta Solterra, no la naranja del ejemplo).
5. **Registro del SW:** un pequeño island cliente (`<RegisterSW />`, `return null`)
   montado en `src/app/(operativo)/layout.tsx` (server component que ya inyecta el
   script de tema — precedente perfecto). Así el SW **solo se registra tras pasar
   el guard de sesión y solo para el módulo de terreno**, sin afectar Comercial ni
   el sitio público. El `<link rel="manifest">` se agrega vía `metadata` de ese
   layout.

### 4.2 Qué rutas se precachean

Next 15 con RSC no permite precachear el HTML dinámico de las páginas como si
fuera estático. Estrategia por tipo:

- **App shell + assets estáticos (precache):** el JS/CSS del cliente de terreno,
  las fuentes de `public/fonts`, el logo, los íconos PWA y una **página de
  fallback offline** (`/operacion/offline`) — todo lo que Serwist reconoce del
  build.
- **Navegaciones RSC (network-first con fallback):** al navegar a
  `/operacion/checklists/nuevo` etc., se intenta red; si no hay, se sirve el shell
  cacheado + la página de fallback que explica *"Sin conexión — puedes llenar
  formularios, se enviarán al recuperar señal"*. Los formularios funcionan porque
  su JS ya está cacheado y los catálogos vienen de IndexedDB (§4.3).
- **`POST /api/terreno/sync`: nunca se cachea** (Serwist excluye no-GET).

### 4.3 Estrategia para catálogos (equipos, responsables)

Los catálogos son datos dinámicos de RSC, no assets → **no** van en el caché del
SW, van en **IndexedDB** (misma base Dexie), para poder leerlos offline y
poblarlos en los `<select>`:

```
// db "solterra-terreno", version 3 (aditivo)
catalogos: {
  key: string,        // "equipos" | "responsables"  (clave primaria)
  data: object[],     // el arreglo de opciones
  fetchedAt: number,  // epoch — para refrescar
}
```
- Se hidratan/actualizan **cuando hay red** (al abrir cualquier página de terreno
  online, se guardan las opciones que el server ya envió como props → cero fetch
  extra), o vía un `GET /api/terreno/catalogos` liviano.
- Offline, los `<select>` leen de IndexedDB. Si un catálogo nunca se cargó (primer
  uso sin red), se avisa *"Conéctate una vez para descargar los equipos"*.
- Los catálogos son **datos no sensibles** (código/nombre de equipo, nombre de
  responsable); es aceptable cachearlos en el dispositivo. **No** se cachea
  sesión, permisos ni datos de otros módulos.

### 4.4 Implicancias con Vercel

- El SW (`/sw.js`) se sirve como estático desde Vercel sin problema; scope raíz
  correcto. Conviene el header `Service-Worker-Allowed: /` (o acotarlo a
  `/operacion`,`/mantencion`).
- **Cuidado con actualizaciones:** un SW que cachea agresivamente puede servir una
  versión vieja tras un deploy. Serwist maneja versionado por revisión, pero hay
  que definir política de `skipWaiting`/prompt de "hay una versión nueva,
  recargar". Se debe **excluir del precache** cualquier ruta del módulo Comercial
  para no servir facturas/OC stale.
- `images.unoptimized: true` ya está activo → no hay interferencia con el
  optimizador de imágenes de Vercel.
- El deploy sigue siendo automático GitHub→Vercel; no hay cambios de
  infraestructura.

### Estimación de esfuerzo

**~3–4 días.** Incluye: integración Serwist, manifest + generación de íconos,
island de registro, página de fallback offline, cacheo de catálogos en IndexedDB
y su hidratación, política de actualización del SW y headers en Vercel. Riesgo
medio: un SW mal acotado podría cachear rutas indebidas → mitigado excluyendo
Comercial y el sitio público explícitamente.

**Qué se demuestra:** poner el celular en modo avión **antes** de abrir la app →
la app abre igual, muestra la lista de equipos, se llena un formulario y queda
🟡 Pendiente → al volver la red, sincroniza.

---

## 5. Riesgos y decisiones de producto (para el cliente)

### 5.1 Correlativo diferido — cómo se ve un documento "Pendiente"

Solo el **Checklist de Mantención** lleva número correlativo, y ese número lo
asigna el servidor. Offline, el documento existe **sin número** hasta
sincronizar. Mockup de cómo lo ve el operador:

```
┌─────────────────────────────────────────────┐
│  Check List de Mantención        🟡 Pendiente │
│                                                │
│  N.º correlativo:  — (se asigna al sincronizar)│
│  Equipo:  CA-001  Retroexcavadora              │
│  Fecha:   04/07/2026                           │
│  Guardado en este dispositivo: 14:32           │
│                                                │
│  ⬆ Este registro se enviará automáticamente    │
│    cuando haya conexión.                        │
└─────────────────────────────────────────────┘
```

Tras sincronizar:
```
┌─────────────────────────────────────────────┐
│  Check List de Mantención     🟢 Sincronizado │
│                                                │
│  N.º correlativo:  N.º 42 / 2026               │
│  ...                                            │
└─────────────────────────────────────────────┘
```

**Decisión de producto a confirmar:** el correlativo refleja el **orden de llegada
al servidor**, no el orden en que se llenaron los formularios en terreno. Dos
operadores offline pueden llenar en un orden y recibir números en otro. Es la
única forma de garantizar correlativos únicos y sin huecos; asignarlos en el
cliente rompería la unicidad. Los otros dos documentos (Parte/Registro, Checklist
de Operación) **no tienen este tema**: se identifican por fecha/equipo, sin
número.

### 5.2 Fotos — excluidas de v1

Los formularios en alcance **hoy no capturan fotos ni firmas** (aunque el esquema
tiene columnas para ello). Por lo tanto:

- **Decisión recomendada:** v1 offline **excluye fotos y firmas**, igual que el
  comportamiento actual. Cero regresión, alcance acotado.
- Cuando se agregue captura de fotos (a futuro), la cola binaria es un problema
  aparte: las imágenes se guardarían como `Blob` en IndexedDB (no como base64, por
  peso), se subirían a Supabase Storage en un paso previo al `create`, y el sync
  referenciaría las URLs ya subidas. Eso es un **Nivel 2.5** propio, no v1.
- Riesgo si se fuerza fotos en v1: los `Blob` grandes inflan IndexedDB y la subida
  a Storage necesita su propio manejo de reintentos y de token → duplica la
  complejidad del outbox. **No recomendado para v1.**

### 5.3 Cosas del código actual que complican (y cómo se resuelven)

- **Estado heterogéneo de los formularios** (FormData + useState mezclados) →
  impide un autosave genérico; se resuelve con `buildSnapshot`/`applySnapshot` por
  formulario (§2). Costo: unas pocas líneas por form.
- **El `create` vive dentro de los Server Actions** → hay que extraer el core a
  funciones compartidas para que el Route Handler no duplique lógica. Es refactor
  de bajo riesgo pero **toca API y lógica de correlativo (zonas protegidas)** →
  requiere aprobación.
- **`unstable_cache` en catálogos** → el sync invalida con `revalidateTag`, pero
  las listas cacheadas pueden mostrarse stale ≤60 s tras sincronizar (mismo
  gotcha ya conocido del proyecto). Se mitiga con el `router.refresh()` del
  drainer al confirmar `synced`.
- **Área de uso / centro de costo / tipo mantención son texto libre** → offline no
  hay validación contra catálogo; se acepta cualquier texto (igual que online).
  Sin cambio.
- **Región Supabase en Oregon** → irrelevante offline; solo afecta la latencia del
  sync online, que ya es asíncrono y en background.

---

## 6. Roadmap

### Orden recomendado

**Nivel 1 → Nivel 2 → Nivel 3.** El orden importa: el Nivel 1 crea la base Dexie y
el `applySnapshot` que el Nivel 2 reutiliza para el flujo de corrección; el
Nivel 2 crea el outbox que el Nivel 3 solo necesita poder abrir sin red. Cada uno
es desplegable por sí solo.

| Nivel | Esfuerzo | Riesgo | Zonas protegidas tocadas | Entregable demostrable |
|-------|----------|--------|--------------------------|------------------------|
| **1. Borradores** | 2–3 días | Bajo | Ninguna (aditivo) | Cerrar la app a mitad de un checklist y retomarlo |
| **2. Outbox + sync** | 5–8 días | Medio | API (ruta nueva), Auth (solo lectura), correlativo | Guardar en modo avión y ver sincronizar sin duplicar |
| **3. PWA (Serwist)** | 3–4 días | Medio | Config Next, headers Vercel | Abrir la app y sus catálogos sin red |

**Total estimado: ~10–15 días** de desarrollo, más QA de terreno real (celulares
390×844 / 430×932, modo avión, red intermitente).

### Qué se le demuestra al cliente al cierre de cada nivel

- **Cierre Nivel 1:** *"Ya no se pierde lo escrito."* Llenar medio formulario,
  matar la app, reabrir, retomar.
- **Cierre Nivel 2:** *"Se puede trabajar sin señal y se sincroniza solo."* Modo
  avión → guardar 2–3 documentos → reactivar red → verlos sincronizar, con el
  checklist de mantención recibiendo su correlativo, y demostrar que reintentar no
  duplica.
- **Cierre Nivel 3:** *"La app abre aunque no haya nada de red."* Modo avión antes
  de abrir → la app y los equipos cargan igual → llenar y encolar.

### Decisiones que necesito confirmar con el cliente antes de implementar

1. **Correlativo por orden de sincronización** (no por orden de llenado) para el
   Checklist de Mantención — §5.1.
2. **Fotos excluidas de v1** — §5.2.
3. **Aprobación para tocar zonas protegidas** en el Nivel 2 (extraer el core de
   creación de los actions, nueva ruta `/api/terreno/sync`, lectura de sesión) —
   §3.

---

*Documento de diseño. No incluye código de producción. La implementación de cada
nivel requiere aprobación previa por tocar auth, API y lógica de correlativo
(zonas protegidas).*
