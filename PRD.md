# SOLTERRA – Plan Técnico Ordenado y Arquitectura Recomendada

## 1. Resumen del proyecto

**SOLTERRA** será una AppWeb de gestión empresarial y administrativa.

Su objetivo principal es permitir que una empresa pueda administrar procesos internos de forma más ordenada, especialmente:

- Crear facturas.
- Registrar clientes.
- Guardar documentos.
- Imprimir y descargar documentos en PDF.
- Controlar usuarios por perfil.
- Trabajar desde computador, tablet o celular.

La aplicación debe ser:

- Segura.
- Intuitiva.
- Profesional.
- Fácil de usar.
- Adaptable a distintos dispositivos.
- Pensada para oficina y terreno.

---

## 2. Necesidad principal que debe cubrir

Según lo solicitado, SOLTERRA debe enfocarse primero en lo esencial.

La primera versión debe cubrir:

1. Login seguro.
2. Dashboard principal simple.
3. Módulo de facturas.
4. Módulo de clientes.
5. Módulo de documentos.
6. Control de usuarios por perfil.
7. Impresión de facturas.
8. Descarga de facturas en PDF.
9. Estados de factura.
10. Diseño claro, simple y responsive.

---

## 3. Alcance recomendado

Para evitar que el proyecto crezca demasiado desde el inicio, se recomienda dividirlo en etapas.

### 3.1 Primera versión

La primera versión debe enfocarse en:

- Login.
- Dashboard.
- Clientes.
- Productos o servicios.
- Facturas.
- PDF.
- Estados.
- Usuarios.
- Seguridad básica.
- Auditoría de acciones importantes.

### 3.2 Segunda versión

Después de tener lo anterior funcionando bien, se pueden agregar:

- Órdenes de compra.
- Control documental avanzado.
- Reportes.
- Aprobaciones por supervisor.
- Notificaciones.
- Exportación a Excel.
- PWA avanzada.
- Integración con factura electrónica tributaria si se requiere.

---

## 4. Aclaración importante sobre facturas

Antes de desarrollar, se debe definir qué tipo de factura necesita SOLTERRA.

### 4.1 Factura administrativa interna

Es una factura o documento interno para control de la empresa.

Permite:

- Registrar cliente.
- Agregar productos o servicios.
- Calcular subtotal.
- Calcular IVA.
- Calcular total.
- Imprimir.
- Descargar PDF.
- Guardar historial.

Esta opción es la más recomendable para iniciar.

### 4.2 Factura electrónica tributaria

Si la empresa necesita que la factura tenga validez tributaria en Chile, se requiere integración con DTE/SII.

Esto implica:

- Folios autorizados.
- Firma electrónica.
- XML tributario.
- Envío al SII.
- Validación de respuesta.
- Manejo de errores.
- Mayor seguridad.
- Mayor tiempo de desarrollo.

### 4.3 Recomendación

Para la primera versión se recomienda desarrollar:

> Factura administrativa interna en PDF.

Luego, si la empresa lo necesita, se puede agregar integración con factura electrónica tributaria.

---

## 5. Stack tecnológico recomendado

El stack recomendado para SOLTERRA es:

```txt
Next.js + TypeScript
Supabase Auth
PostgreSQL
Prisma
Tailwind CSS
shadcn/ui
React PDF o PDFKit
Supabase Storage
Vercel
PWA opcional
```

---

## 6. Explicación simple del stack

### 6.1 Next.js + TypeScript

Se recomienda usar **Next.js** porque permite crear la AppWeb completa en un solo proyecto.

Sirve para:

- Crear pantallas.
- Crear formularios.
- Proteger rutas.
- Crear el dashboard.
- Manejar lógica del servidor.
- Generar documentos.
- Conectar con la base de datos.

**TypeScript** ayuda a mantener el código más seguro y ordenado.

---

### 6.2 Supabase Auth

Se recomienda usar **Supabase Auth** para manejar el acceso seguro.

Permite:

- Login con correo.
- Contraseña segura.
- Recuperación de contraseña.
- Validar usuarios autorizados.
- Cerrar sesión.
- Controlar sesiones.

---

### 6.3 PostgreSQL

**PostgreSQL** será la base de datos principal.

Guardará:

- Usuarios.
- Clientes.
- Productos o servicios.
- Facturas.
- Detalles de facturas.
- Documentos.
- Auditoría.
- Configuración de empresa.

---

### 6.4 Prisma

**Prisma** ayudará a conectar la aplicación con la base de datos.

Sirve para:

- Crear modelos.
- Mantener la base de datos ordenada.
- Evitar errores.
- Crear migraciones.
- Hacer consultas de forma más segura.

---

### 6.5 Tailwind CSS + shadcn/ui

Se recomienda para crear una interfaz moderna y limpia.

Permite construir:

- Botones claros.
- Formularios ordenados.
- Tablas simples.
- Tarjetas para el dashboard.
- Menús responsivos.
- Diseño profesional.

---

### 6.6 React PDF o PDFKit

Se usará para generar facturas en PDF.

Debe permitir:

- Descargar factura.
- Imprimir factura.
- Guardar una copia digital.
- Incluir logo de empresa.
- Incluir datos del cliente.
- Incluir productos, IVA y total.

---

### 6.7 Supabase Storage

Se usará para guardar documentos.

Por ejemplo:

- Facturas en PDF.
- Logo de empresa.
- Documentos asociados a clientes.
- Archivos administrativos.

---

### 6.8 Vercel

Se recomienda usar **Vercel** para publicar la AppWeb.

Permite:

- Publicar el proyecto fácilmente.
- Mantener buen rendimiento.
- Usar variables de entorno.
- Actualizar la app con mayor orden.

---

### 6.9 PWA opcional

La PWA puede ser útil para uso en terreno.

Permite:

- Instalar la app en celular.
- Mejorar experiencia móvil.
- Mostrar la app aunque la conexión sea débil.
- Cachear pantallas básicas.

Recomendación:

> En primera versión, usar PWA solo como mejora básica.  
> No guardar facturas definitivas sin conexión para evitar errores o duplicidad.

---

## 7. Arquitectura general

```txt
SOLTERRA AppWeb
│
├── Frontend Next.js
│   ├── Login
│   ├── Dashboard
│   ├── Facturas
│   ├── Clientes
│   ├── Productos / Servicios
│   ├── Documentos
│   └── Configuración
│
├── Backend Next.js
│   ├── Validaciones
│   ├── Cálculo de IVA
│   ├── Cálculo de totales
│   ├── Generación de PDF
│   ├── Control de estados
│   ├── Auditoría
│   └── Seguridad
│
├── Supabase
│   ├── Auth
│   ├── PostgreSQL
│   ├── Storage
│   └── Row Level Security
│
└── Prisma
    ├── Modelos
    ├── Migraciones
    └── Consultas seguras
```

---

## 8. Módulos del sistema

## 8.1 Login seguro

El login debe incluir:

- Correo electrónico.
- Contraseña alfanumérica segura.
- Recuperación de contraseña.
- Validación de usuario autorizado.
- Cierre de sesión.
- Rutas protegidas.
- Acceso según perfil.

---

## 8.2 Dashboard principal

El dashboard debe ser simple y directo.

Debe mostrar tres accesos principales:

```txt
[ Facturas ]   [ Clientes ]   [ Documentos ]
```

También puede mostrar:

- Últimas facturas.
- Facturas creadas.
- Facturas enviadas.
- Facturas pagadas.
- Facturas anuladas.

No debe tener exceso de información.

---

## 8.3 Módulo Facturas

Este será el módulo principal de SOLTERRA.

Debe permitir:

- Crear factura.
- Seleccionar cliente.
- Crear cliente nuevo si no existe.
- Agregar productos o servicios.
- Agregar cantidad.
- Agregar precio unitario.
- Calcular subtotal.
- Calcular IVA.
- Calcular total.
- Seleccionar moneda.
- Guardar factura.
- Imprimir factura.
- Descargar PDF.
- Buscar facturas anteriores.
- Ver estado de factura.

---

## 8.4 Estados de factura

Los estados recomendados son:

```txt
CREADA
ENVIADA
PAGADA
ANULADA
```

Regla importante:

> Una factura anulada no debe eliminarse.  
> Debe quedar guardada con estado ANULADA.

---

## 8.5 Módulo Clientes

Debe permitir:

- Crear cliente.
- Editar cliente.
- Buscar cliente.
- Ver historial de facturas.
- Asociar facturas al cliente.
- Desactivar cliente sin eliminarlo.

Datos sugeridos:

- Nombre o razón social.
- RUT.
- Correo electrónico.
- Teléfono.
- Dirección.
- Observaciones.
- Estado activo/inactivo.

---

## 8.6 Módulo Productos / Servicios

Este módulo ayuda a crear facturas más rápido.

Debe permitir:

- Crear producto o servicio.
- Editar producto o servicio.
- Buscar producto o servicio.
- Definir descripción.
- Definir precio unitario.
- Activar o desactivar registros.
- Usar productos dentro de una factura.

Ejemplos:

- Servicio de mantención.
- Transporte.
- Arriendo de maquinaria.
- Materiales.
- Asesoría.
- Producto específico.

---

## 8.7 Módulo Documentos

Debe permitir:

- Guardar PDF de facturas.
- Descargar documentos.
- Visualizar documentos.
- Asociar documentos a clientes.
- Asociar documentos a facturas.
- Mantener historial documental.

---

## 8.8 Módulo Configuración de Empresa

Debe ser administrado solo por el perfil Administrador.

Debe permitir configurar:

- Razón social.
- RUT.
- Giro.
- Dirección.
- Teléfono.
- Correo.
- Logo corporativo.
- Moneda principal.
- Porcentaje de IVA.

Estos datos se usarán automáticamente en las facturas PDF.

---

## 8.9 Órdenes de compra

La solicitud general menciona órdenes de compra.

Por eso, se recomienda dejar este módulo planificado para una segunda etapa.

Debe permitir:

- Crear orden de compra.
- Seleccionar proveedor.
- Agregar productos o servicios.
- Calcular subtotal.
- Calcular IVA.
- Calcular total.
- Definir estado.
- Descargar PDF.
- Imprimir.
- Registrar auditoría.

Estados sugeridos:

```txt
BORRADOR
EMITIDA
APROBADA
RECHAZADA
ANULADA
```

---

## 9. Perfiles de usuario

## 9.1 Administrador

Puede:

- Acceder a todo el sistema.
- Crear usuarios.
- Editar usuarios.
- Activar o desactivar usuarios.
- Ver todas las facturas.
- Anular documentos.
- Revisar auditoría.
- Configurar datos de empresa.
- Cargar logo corporativo.
- Administrar productos o servicios.

---

## 9.2 Supervisor

Puede:

- Ver facturas.
- Revisar documentos.
- Supervisar acciones.
- Acceder a reportes básicos.
- Cambiar ciertos estados si tiene permiso.

---

## 9.3 Usuario

Puede:

- Crear facturas.
- Ver sus registros permitidos.
- Buscar facturas.
- Descargar PDF.
- Imprimir documentos.
- Crear clientes si tiene permiso.

---

## 10. Base de datos recomendada

Tablas principales:

```txt
company_settings
profiles
clients
products
invoices
invoice_items
documents
audit_logs
purchase_orders
purchase_order_items
```

---

## 10.1 company_settings

Guarda los datos de la empresa emisora.

```txt
company_settings
- id
- razon_social
- rut
- giro
- direccion
- telefono
- email
- logo_url
- moneda_principal
- iva_porcentaje
- created_at
- updated_at
```

---

## 10.2 profiles

Guarda el perfil interno del usuario.

```txt
profiles
- id
- auth_user_id
- nombre
- email
- rol
- activo
- created_at
- updated_at
```

---

## 10.3 clients

Guarda los clientes.

```txt
clients
- id
- nombre
- rut
- email
- telefono
- direccion
- observaciones
- activo
- created_at
- updated_at
```

---

## 10.4 products

Guarda productos o servicios.

```txt
products
- id
- codigo_interno
- nombre
- descripcion
- precio_unitario
- activo
- created_at
- updated_at
```

---

## 10.5 invoices

Guarda las facturas.

```txt
invoices
- id
- numero_factura
- client_id
- user_id
- moneda
- tipo_cambio
- fecha_tipo_cambio
- subtotal
- iva
- total
- estado
- fecha_emision
- pdf_url
- tipo_documento
- folio_fiscal
- xml_documento
- created_at
- updated_at
```

Nota:

- `folio_fiscal` y `xml_documento` solo son necesarios si se integra factura electrónica tributaria.
- Para la primera versión pueden quedar como campos opcionales o agregarse más adelante.

---

## 10.6 invoice_items

Guarda el detalle de cada factura.

```txt
invoice_items
- id
- invoice_id
- product_id
- descripcion
- cantidad
- precio_unitario
- subtotal
- created_at
```

---

## 10.7 documents

Guarda los documentos generados o cargados.

```txt
documents
- id
- invoice_id
- client_id
- tipo
- nombre_archivo
- url_archivo
- created_at
```

---

## 10.8 audit_logs

Guarda el historial de acciones importantes.

```txt
audit_logs
- id
- user_id
- accion
- modulo
- detalle
- created_at
```

Debe registrar acciones como:

- Inicio de sesión.
- Creación de factura.
- Edición de factura.
- Descarga de PDF.
- Impresión de factura.
- Cambio de estado.
- Anulación de factura.
- Creación de cliente.
- Edición de cliente.
- Desactivación de cliente.
- Modificación de configuración.

---

## 10.9 purchase_orders

Tabla preparada para órdenes de compra.

```txt
purchase_orders
- id
- numero_oc
- proveedor_nombre
- proveedor_rut
- user_id
- moneda
- subtotal
- iva
- total
- estado
- fecha_emision
- pdf_url
- created_at
- updated_at
```

---

## 10.10 purchase_order_items

Detalle de órdenes de compra.

```txt
purchase_order_items
- id
- purchase_order_id
- descripcion
- cantidad
- precio_unitario
- subtotal
- created_at
```

---

## 11. Seguridad del sistema

La seguridad debe aplicarse desde el inicio.

Medidas recomendadas:

- Supabase Auth.
- Contraseñas seguras.
- Recuperación de contraseña.
- Middleware de autenticación.
- Rutas protegidas.
- Roles por perfil.
- Row Level Security.
- Validación en frontend y backend.
- Variables de entorno.
- No exponer claves privadas.
- Auditoría.
- Backups.
- Confirmaciones antes de acciones críticas.

---

## 12. Eliminación lógica

No se deben eliminar físicamente registros importantes.

Se recomienda usar:

```txt
activo: true / false
```

Esto aplica a:

- Clientes.
- Productos.
- Usuarios internos.
- Documentos relacionados.

Para facturas se debe usar:

```txt
ANULADA
```

Esto permite mantener:

- Historial.
- Trazabilidad.
- Auditoría.
- Relaciones entre tablas.

---

## 13. Monedas

El módulo de facturas debe permitir:

```txt
CLP
USD
UF
```

Recomendación técnica:

- Guardar la moneda seleccionada.
- Guardar el tipo de cambio usado.
- Guardar fecha del tipo de cambio.
- No recalcular facturas antiguas con valores nuevos.

Campos sugeridos:

```txt
moneda
tipo_cambio
fecha_tipo_cambio
```

---

## 14. IVA

El sistema debe calcular:

```txt
subtotal
IVA
total
```

El porcentaje de IVA debe ser configurable desde el módulo de empresa.

Ejemplo:

```txt
iva_porcentaje = 19
```

También se recomienda dejar preparado para:

```txt
Documento afecto
Documento exento
```

---

## 15. Flujo principal de creación de factura

```txt
1. Usuario inicia sesión.
2. Ingresa al dashboard.
3. Selecciona Facturas.
4. Presiona Crear nueva factura.
5. Busca o crea cliente.
6. Agrega productos o servicios.
7. El sistema calcula subtotal.
8. El sistema calcula IVA.
9. El sistema calcula total.
10. Usuario selecciona moneda.
11. Usuario revisa la factura.
12. Sistema pide confirmación.
13. Se guarda la factura.
14. Se genera PDF.
15. Se guarda PDF en Supabase Storage.
16. Usuario puede imprimir o descargar.
17. Acción queda registrada en auditoría.
```

---

## 16. Flujo de anulación de factura

```txt
1. Usuario abre una factura.
2. Presiona Anular.
3. Sistema muestra advertencia clara.
4. Usuario confirma.
5. Sistema solicita motivo de anulación.
6. Sistema cambia estado a ANULADA.
7. Sistema registra usuario, fecha y motivo.
8. La factura queda visible en historial.
```

---

## 17. Confirmaciones obligatorias

El sistema debe pedir confirmación antes de:

- Guardar factura.
- Imprimir factura.
- Descargar PDF si corresponde.
- Anular factura.
- Cambiar estado a pagada.
- Desactivar cliente.
- Desactivar producto.
- Modificar configuración de empresa.

---

## 18. Usabilidad

SOLTERRA debe ser fácil de usar para cualquier usuario.

Debe considerar:

- Botones grandes.
- Íconos visibles.
- Textos simples.
- Flujo paso a paso.
- Diseño limpio.
- Pocas opciones al inicio.
- Confirmaciones preventivas.
- Mensajes de ayuda.
- Formularios ordenados.
- Accesos principales visibles.

---

## 19. Diseño responsive

La AppWeb debe funcionar en:

- Computador.
- Tablet.
- Celular.

Recomendación:

- Computador: tarjetas grandes y tablas completas.
- Tablet: tarjetas en dos columnas.
- Celular: tarjetas en una columna.
- Formularios paso a paso para evitar pantallas largas.

---

## 20. Estructura de carpetas recomendada

```txt
solterra/
│
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── facturas/
│   │   ├── nueva/
│   │   ├── [id]/
│   │   └── page.tsx
│   ├── clientes/
│   ├── productos/
│   ├── documentos/
│   ├── configuracion/
│   └── usuarios/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── cards/
│   └── invoices/
│
├── lib/
│   ├── supabase/
│   ├── prisma/
│   ├── auth/
│   ├── pdf/
│   ├── validations/
│   ├── currency/
│   └── audit/
│
├── prisma/
│   └── schema.prisma
│
├── public/
│   └── icons/
│
├── middleware.ts
├── .env.local
├── package.json
└── README.md
```

---

## 21. Roadmap de desarrollo

## Etapa 1 – Base del proyecto

```txt
1. Crear proyecto Next.js.
2. Configurar TypeScript.
3. Configurar Tailwind CSS.
4. Instalar shadcn/ui.
5. Configurar Supabase.
6. Configurar Prisma.
7. Crear estructura de carpetas.
```

---

## Etapa 2 – Seguridad y usuarios

```txt
1. Crear login.
2. Crear recuperación de contraseña.
3. Crear perfiles de usuario.
4. Crear roles.
5. Proteger rutas.
6. Crear middleware.
```

---

## Etapa 3 – Dashboard

```txt
1. Crear pantalla principal.
2. Agregar acceso a Facturas.
3. Agregar acceso a Clientes.
4. Agregar acceso a Documentos.
5. Mostrar resumen básico.
```

---

## Etapa 4 – Clientes y productos

```txt
1. Crear módulo Clientes.
2. Crear formulario de cliente.
3. Crear buscador de clientes.
4. Crear módulo Productos / Servicios.
5. Crear buscador de productos.
```

---

## Etapa 5 – Facturas

```txt
1. Crear formulario de factura.
2. Agregar cliente.
3. Agregar productos o servicios.
4. Calcular subtotal.
5. Calcular IVA.
6. Calcular total.
7. Seleccionar moneda.
8. Guardar factura.
9. Cambiar estado.
10. Buscar facturas.
```

---

## Etapa 6 – PDF y documentos

```txt
1. Crear plantilla PDF.
2. Agregar logo de empresa.
3. Agregar datos del cliente.
4. Agregar detalle de productos.
5. Agregar subtotal, IVA y total.
6. Descargar PDF.
7. Imprimir PDF.
8. Guardar PDF en Storage.
```

---

## Etapa 7 – Auditoría y seguridad final

```txt
1. Registrar acciones importantes.
2. Validar permisos por rol.
3. Revisar rutas protegidas.
4. Revisar reglas RLS.
5. Revisar variables de entorno.
6. Probar flujos principales.
```

---

## Etapa 8 – Mejoras futuras

```txt
1. Órdenes de compra.
2. Reportes.
3. Exportación a Excel.
4. PWA avanzada.
5. Borradores offline.
6. Integración DTE/SII si se requiere.
```

---

## 22. Puntos aceptados de la propuesta de Gemini

Se consideran útiles y viables los siguientes puntos:

- Agregar PWA como mejora para uso en terreno.
- Crear catálogo de productos y servicios.
- Agregar configuración de empresa.
- Usar eliminación lógica o Soft Delete.
- Dejar preparada una futura integración DTE.
- Considerar folio fiscal y XML como campos futuros.
- Mejorar separación de módulos.
- Planificar órdenes de compra para una segunda etapa.
- Mantener auditoría de acciones.

---

## 23. Puntos que deben controlarse

No se recomienda iniciar con todo como obligatorio.

Se debe tener cuidado con:

1. **Factura electrónica DTE/SII**  
   No debe asumirse desde el inicio. Primero se debe confirmar si la empresa necesita factura tributaria real.

2. **PWA offline**  
   No se recomienda guardar facturas definitivas sin conexión en la primera versión.

3. **Órdenes de compra**  
   Deben quedar planificadas, pero no necesariamente desarrolladas en la primera entrega.

4. **Dashboard**  
   Debe mantenerse simple, con pocos accesos principales.

5. **Alcance del sistema**  
   Primero se debe cubrir lo pedido formalmente antes de agregar funciones avanzadas.

---

## 24. Recomendación final

La arquitectura recomendada para SOLTERRA es:

```txt
Next.js + TypeScript
Supabase Auth
PostgreSQL
Prisma
Tailwind CSS
shadcn/ui
React PDF o PDFKit
Supabase Storage
Vercel
PWA opcional
```

Esta arquitectura cubre correctamente:

- Login seguro.
- Dashboard simple.
- Facturas.
- Clientes.
- Documentos.
- PDF.
- Impresión.
- Estados.
- Roles.
- Seguridad.
- Uso en computador, tablet y móvil.

---

## 25. Conclusión

SOLTERRA debe desarrollarse como una AppWeb empresarial simple, segura y escalable.

La prioridad debe ser cubrir bien lo solicitado:

1. Seguridad.
2. Usabilidad.
3. Facturas.
4. PDF.
5. Clientes.
6. Documentos.
7. Perfiles de usuario.
8. Diseño responsive.

La propuesta de Gemini es viable, pero debe tomarse como mejora complementaria, no como obligación total para la primera versión.

Lo más recomendable es construir una primera versión sólida y luego agregar módulos más avanzados.
