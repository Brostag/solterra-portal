export type HelpEntry = {
  titulo: string;
  descripcion: string;
  paraQueSirve: string;
  pasos: string[];
  consejos: string[];
};

export const HELP_CONTENT: Record<string, HelpEntry> = {
  "/dashboard": {
    titulo: "Dashboard",
    descripcion: "Vista general del estado operativo y financiero de Solterra.",
    paraQueSirve:
      "El dashboard centraliza las métricas más importantes del negocio: facturas emitidas en el período, órdenes de compra pendientes, montos totales y acceso rápido a los módulos principales.",
    pasos: [
      "Revisa los indicadores superiores para una vista rápida del período actual.",
      "Consulta las últimas facturas y órdenes de compra en las tablas resumen.",
      "Usa los accesos directos para navegar a los módulos más utilizados.",
    ],
    consejos: [
      "El dashboard se actualiza con cada visita. Recarga la página para ver los datos más recientes.",
      "Los montos se muestran en la moneda configurada en Configuración (por defecto CLP).",
    ],
  },

  "/facturas": {
    titulo: "Facturas",
    descripcion: "Gestión de facturas emitidas a clientes por servicios y productos de Solterra.",
    paraQueSirve:
      "Permite crear, consultar y hacer seguimiento del ciclo de vida de las facturas: desde borrador hasta pago o anulación.",
    pasos: [
      "Haz clic en «Nueva Factura» para crear un nuevo documento.",
      "Selecciona el cliente al que va dirigida la factura.",
      "Agrega líneas con productos o servicios desde el catálogo.",
      "Guarda como borrador para revisar más tarde, o emite la factura directamente.",
      "Desde el detalle puedes cambiar el estado: Pendiente → Pagada → Anulada.",
    ],
    consejos: [
      "Los productos deben estar creados en «Productos» antes de agregarlos a una factura.",
      "Una factura anulada no se puede reactivar. Verifica los datos antes de anular.",
      "Usa los filtros por estado para ver solo las facturas pendientes de pago.",
    ],
  },

  "/ordenes-compra": {
    titulo: "Órdenes de Compra",
    descripcion: "Registro y seguimiento de compras que Solterra realiza a sus proveedores.",
    paraQueSirve:
      "Centraliza todas las compras de Solterra: materiales, servicios y arriendo de equipos. Permite hacer seguimiento desde la emisión de la orden hasta el pago al proveedor.",
    pasos: [
      "Haz clic en «Nueva OC» para registrar una nueva orden de compra.",
      "Selecciona el proveedor correspondiente.",
      "Agrega los ítems con cantidad y precio unitario.",
      "Cambia el estado según avance el proceso: Borrador → Emitida → Enviada → Aprobada.",
      "Desde el detalle puedes adjuntar documentos relacionados a la OC.",
    ],
    consejos: [
      "Los proveedores deben estar registrados antes de crear una OC.",
      "Adjunta la factura del proveedor en «Documentos» para mantener el respaldo.",
      "Filtra por estado para identificar qué OC están pendientes de recibir o pagar.",
    ],
  },

  "/clientes": {
    titulo: "Clientes",
    descripcion: "Directorio de empresas y personas que contratan los servicios de Solterra.",
    paraQueSirve:
      "Administra el catálogo de clientes: datos de contacto, RUT y estado. Desde el detalle de cada cliente puedes ver el historial de facturas y documentos asociados.",
    pasos: [
      "Usa el buscador para encontrar un cliente por nombre o RUT.",
      "Haz clic en el ícono de ojo para ver el detalle y el historial de facturas.",
      "Haz clic en «Nuevo Cliente» para registrar una empresa o persona.",
      "Desde el detalle puedes editar los datos o cambiar el estado activo/inactivo.",
    ],
    consejos: [
      "Mantén el RUT actualizado: es necesario para la correcta emisión de facturas.",
      "Un cliente inactivo no desaparece del sistema, solo queda marcado como inactivo.",
      "Usa el filtro «Activos» para ver solo los clientes con los que trabajas actualmente.",
    ],
  },

  "/productos": {
    titulo: "Productos y Servicios",
    descripcion: "Catálogo de ítems que Solterra ofrece y que se usan al crear facturas.",
    paraQueSirve:
      "Define los productos y servicios disponibles para facturar: arriendo de maquinaria, servicios de movimiento de tierra, materiales, etc. Los precios registrados aquí se usan como referencia al emitir facturas.",
    pasos: [
      "Haz clic en «Nuevo» para agregar un producto o servicio al catálogo.",
      "Asigna un código interno, nombre, descripción y precio unitario.",
      "El producto quedará disponible para seleccionar al crear facturas.",
      "Desde el detalle puedes editar la información o desactivar el producto.",
    ],
    consejos: [
      "El código interno ayuda a identificar los productos rápidamente al facturar.",
      "Desactivar un producto no borra el historial de facturas donde fue utilizado.",
      "Mantén los precios actualizados para tener una referencia real al facturar.",
    ],
  },

  "/documentos": {
    titulo: "Documentos",
    descripcion: "Repositorio de archivos del negocio: contratos, cotizaciones, guías de despacho y más.",
    paraQueSirve:
      "Permite subir y organizar todos los archivos relacionados con el negocio, asociándolos a clientes, facturas, órdenes de compra o proveedores para tener todo el respaldo en un solo lugar.",
    pasos: [
      "Usa el formulario superior para subir un nuevo archivo.",
      "Selecciona el tipo de documento (Contrato, Cotización, Guía de Despacho, etc.).",
      "Asocia el documento a una entidad: cliente, factura, OC o proveedor.",
      "Descarga cualquier archivo desde el botón de descarga en la tabla.",
    ],
    consejos: [
      "Asociar documentos a entidades facilita encontrarlos desde el detalle del cliente o la factura.",
      "Solo Supervisores y Administradores pueden subir y eliminar documentos.",
      "Usa los filtros de tipo y entidad para encontrar documentos en repositorios grandes.",
    ],
  },

  "/proveedores": {
    titulo: "Proveedores",
    descripcion: "Registro de las empresas que abastecen a Solterra con materiales, equipos y servicios.",
    paraQueSirve:
      "Administra el directorio de proveedores: datos de contacto, RUT y estado. Desde el detalle de cada proveedor puedes ver las órdenes de compra asociadas.",
    pasos: [
      "Haz clic en «Nuevo Proveedor» para registrar una empresa proveedora.",
      "Completa nombre, RUT, persona de contacto y teléfono.",
      "Desde el detalle puedes ver las OC asociadas al proveedor.",
      "Desactiva proveedores que ya no son vigentes para mantener la lista limpia.",
    ],
    consejos: [
      "El RUT es importante para mantener el registro correcto de compras.",
      "La columna OC muestra cuántas órdenes de compra tiene registradas cada proveedor.",
      "Un proveedor inactivo no aparece en el selector al crear nuevas OC.",
    ],
  },

  "/configuracion": {
    titulo: "Configuración",
    descripcion: "Parámetros del negocio que se aplican en facturas y documentos del portal.",
    paraQueSirve:
      "Permite configurar los datos de la empresa, la moneda de trabajo y el porcentaje de IVA. Esta información se usa automáticamente al generar facturas y documentos.",
    pasos: [
      "Completa los datos de la empresa: razón social, RUT, dirección y ciudad.",
      "Verifica que el porcentaje de IVA sea correcto (19% en Chile).",
      "Haz clic en «Guardar» para aplicar los cambios.",
    ],
    consejos: [
      "Los cambios se aplican a nuevas facturas, no a las ya emitidas.",
      "Mantén el RUT de empresa actualizado: aparece en los documentos generados.",
      "Solo los Administradores tienen acceso a este módulo.",
    ],
  },

  "/usuarios": {
    titulo: "Usuarios",
    descripcion: "Gestión de cuentas y permisos de acceso al portal interno.",
    paraQueSirve:
      "Permite invitar nuevos colaboradores al portal, asignar roles y gestionar el acceso. Cada rol define qué puede ver y hacer cada persona en el sistema.",
    pasos: [
      "Haz clic en «Invitar Usuario» para enviar acceso a un nuevo colaborador.",
      "Ingresa el correo electrónico y selecciona el rol correspondiente.",
      "El usuario recibirá un correo para activar su cuenta.",
      "Desde el detalle puedes cambiar el rol o desactivar la cuenta.",
    ],
    consejos: [
      "Rol Usuario: solo lectura. Supervisor: lectura y escritura. Administrador: acceso total.",
      "Desactivar una cuenta no la elimina: el historial en Auditoría se conserva.",
      "Solo los Administradores tienen acceso a este módulo.",
    ],
  },

  "/auditoria": {
    titulo: "Auditoría",
    descripcion: "Registro cronológico de todas las acciones realizadas en el portal.",
    paraQueSirve:
      "Proporciona trazabilidad completa del sistema: quién hizo qué, en qué módulo y cuándo. Útil para revisiones de seguridad, resolución de incidencias y control de cambios.",
    pasos: [
      "Consulta el registro más reciente en la tabla principal.",
      "Filtra por módulo para ver solo las acciones en facturas, clientes, usuarios, etc.",
      "Usa el buscador para encontrar acciones de un usuario específico.",
    ],
    consejos: [
      "El registro de auditoría es de solo lectura y no puede modificarse.",
      "Solo los Administradores tienen acceso a este módulo.",
      "Se muestran las últimas 200 acciones. Usa los filtros para acotar la búsqueda.",
    ],
  },

  // ── Módulo Comercial ──────────────────────────────────────────────

  "/empresas": {
    titulo: "Empresas",
    descripcion: "Directorio único de clientes, arrendatarias y proveedores de Solterra.",
    paraQueSirve:
      "Registra una vez cada empresa con la que trabajas y reutilízala en todo el sistema. Los datos del representante legal quedan guardados y se autocompletan al crear un contrato marco.",
    pasos: [
      "Haz clic en «Nueva Empresa» para registrar un cliente, arrendataria o proveedor.",
      "Marca los roles que corresponda: puede ser Cliente y Proveedor a la vez.",
      "Completa RUT, contacto y, si es cliente, el representante legal y su RUT.",
      "Usa los filtros por rol o el buscador para encontrar una empresa.",
    ],
    consejos: [
      "Registra al cliente aquí antes de cotizar o crear un contrato: lo vas a necesitar en los selectores.",
      "El representante legal guardado se reutiliza en el contrato marco, así no lo escribes de nuevo.",
      "El rol Usuario no puede crear ni editar empresas.",
    ],
  },

  "/cotizador": {
    titulo: "Cotizador de Arriendo",
    descripcion: "Calculadora de presupuestos de arriendo de maquinaria y servicios.",
    paraQueSirve:
      "Arma un presupuesto referencial en vivo: agrega equipos por horas o por días, define gastos generales y descuento, y genera la cotización formal o compártela como PDF, WhatsApp o correo. Es referencial, no una factura.",
    pasos: [
      "Elige el cliente (opcional) y revisa el N° de cotización sugerido.",
      "Agrega equipos: usa «Equipo de la flota» como atajo o escríbelo a mano.",
      "Elige «Por horas» o «Por días», pon las fechas Desde/Hasta y el valor hora.",
      "Ajusta gastos generales y descuento; el resumen se recalcula al instante.",
      "Presiona «Generar cotización» para guardarla, o usa Imprimir / PDF / WhatsApp para compartir la vista previa.",
    ],
    consejos: [
      "«Generar cotización» la guarda en el sistema; las acciones de compartir son solo vista previa y no la guardan.",
      "Los equipos con estado Activo en Mantención aparecen en «Equipo de la flota».",
      "Administradores y Supervisores pueden guardar su lista de gastos con «Guardar mis gastos» para las próximas veces.",
    ],
  },

  "/cotizaciones": {
    titulo: "Cotizaciones",
    descripcion: "Listado de las cotizaciones formales guardadas desde el cotizador.",
    paraQueSirve:
      "Guarda, consulta y hace seguimiento de las cotizaciones emitidas a clientes. Desde aquí las abres, descargas el PDF, editas los borradores y las anulas.",
    pasos: [
      "Filtra por estado (Borrador, Emitida, Anulada) o busca por número o cliente.",
      "Haz clic en una fila para ver el detalle de la cotización.",
      "Descarga el PDF con el botón de descarga.",
      "«Nueva Cotización» te lleva al cotizador para crear una nueva.",
    ],
    consejos: [
      "Solo las cotizaciones en Borrador se pueden editar. Una vez Emitida queda fija.",
      "El número correlativo no se reordena aunque elimines una cotización: los números emitidos no se reutilizan.",
      "Una cotización Emitida no se elimina; si ya no aplica, anúlala.",
    ],
  },

  "/contratos": {
    titulo: "Contratos Marco",
    descripcion: "Contratos de arriendo de maquinaria entre Solterra y sus clientes.",
    paraQueSirve:
      "Formaliza el arriendo con un contrato marco que reúne cliente, plazo, equipos y respaldo fotográfico. Al asociar una cotización, buena parte de los datos se autocompletan.",
    pasos: [
      "Haz clic en «Nuevo Contrato» (el cliente debe existir antes en Empresas).",
      "Paso 1: elige el cliente y, si quieres, la cotización asociada para autocompletar.",
      "Paso 2: define ciudad, vigencia, forma de pago y el N° de cotización/anexo.",
      "Paso 3: revisa los equipos arrendados y adjunta las fotos de respaldo.",
      "Guarda: el contrato se crea en estado Borrador.",
    ],
    consejos: [
      "Al elegir la cotización se rellenan cliente, fechas y equipos. Si ya escribiste equipos, te pide confirmar el reemplazo.",
      "Solo Cliente, Fecha de inicio y los equipos son obligatorios.",
      "El PDF del contrato incluye el anexo con el detalle de los equipos.",
    ],
  },

  // ── Módulo de Mantención ──────────────────────────────────────────

  "/mantencion": {
    titulo: "Módulo de Mantención",
    descripcion: "Planificación de trabajos, mantenciones, certificados y vencimientos de la flota.",
    paraQueSirve:
      "Centraliza el ciclo de mantención de los equipos: desde el plan de trabajo hasta la orden de trabajo en taller, más el control de vencimientos de documentos.",
    pasos: [
      "Revisa los indicadores de equipos en mantención, mantenciones abiertas y certificados.",
      "Entra a Equipos para dar de alta la flota y sus fechas de vencimiento.",
      "Crea el plan de trabajo y genera la orden de trabajo hacia el Taller.",
      "Consulta Vencimientos para ver SOAP, permiso, revisión técnica y extintor por equipo.",
    ],
    consejos: [
      "Los equipos se crean aquí, en Mantención, no en Operación.",
      "Si es tu primera vez, abre la Guía de uso para seguir el orden correcto.",
      "Crear planes, mantenciones y certificados requiere rol Administrador o Supervisor.",
    ],
  },

  "/mantencion/equipos": {
    titulo: "Equipos",
    descripcion: "Maquinaria y flota disponible, con sus fechas de vencimiento de documentos.",
    paraQueSirve:
      "Es el registro maestro de la flota. Cada equipo alimenta los selectores de Operación, del cotizador y del contrato, y sus fechas de vencimiento nutren el reporte de Vencimientos.",
    pasos: [
      "Haz clic en «Nuevo equipo» para dar de alta una máquina.",
      "Completa código, nombre, tipo, marca, modelo y patente.",
      "Carga las fechas de vencimiento: SOAP, permiso de circulación, revisión técnica y extintor.",
      "Filtra por estado (Activo, En Mantención) para ubicar equipos.",
    ],
    consejos: [
      "Solo los equipos con estado Activo aparecen en el cotizador y en el contrato.",
      "Las fechas de vencimiento cargadas aquí son las que alimentan el reporte de Vencimientos.",
      "Crear o editar equipos requiere rol Administrador o Supervisor.",
    ],
  },

  "/mantencion/planes": {
    titulo: "Planes de mantención",
    descripcion: "Planificación del trabajo antes de generar la orden de trabajo.",
    paraQueSirve:
      "Define qué se le hará a un equipo (Plan A según fabricante, B preventivo o C correctivo) y sus tareas. Desde el plan se genera la orden de trabajo hacia el Taller.",
    pasos: [
      "Haz clic en «Nuevo plan de mantención».",
      "Elige el registro de entrada (paso 1) para prellenar equipo y horómetro, o planifica manual.",
      "Selecciona el tipo de plan: A (fabricante), B (preventivo) o C (correctivo).",
      "Describe las tareas planificadas y guarda con «Crear plan».",
      "Desde el detalle del plan, presiona «Generar OT» para crear la orden de trabajo.",
    ],
    consejos: [
      "Si partes desde un registro de entrada, se copian equipo, horómetro y observaciones. Todo queda editable.",
      "Al generar la OT el plan pasa a estado «Con OT» y la mantención aparece en el Taller.",
      "Crear planes y generar OT requiere rol Administrador o Supervisor.",
    ],
  },

  "/mantencion/taller": {
    titulo: "Taller / Mantenciones",
    descripcion: "Órdenes de trabajo en ejecución: según fabricante, preventivas, correctivas y de emergencia.",
    paraQueSirve:
      "Es donde se ejecuta la mantención. La orden de trabajo llega desde un plan y avanza por sus estados hasta completarse.",
    pasos: [
      "Revisa la lista de mantenciones y filtra por estado si es necesario.",
      "Abre una mantención para ver su detalle y el equipo asociado.",
      "Avanza el estado a medida que trabajas: Programada → En Proceso → Completada.",
      "Registra el Check List de mantenimiento y emite el certificado cuando corresponda.",
    ],
    consejos: [
      "Las mantenciones aparecen aquí cuando generas la OT desde un plan.",
      "«Nueva mantención» permite crear una directamente si no vino de un plan.",
      "Gestionar el taller requiere rol Administrador o Supervisor.",
    ],
  },

  "/mantencion/checklist-mantencion": {
    titulo: "Check List de Mantenimiento",
    descripcion: "Pauta de taller de 83 ítems: fabricante, preventivo y correctivo.",
    paraQueSirve:
      "Deja registro punto por punto de la revisión de taller. Cada ítem se marca según la pauta del fabricante y queda asociado al equipo y al encargado.",
    pasos: [
      "Haz clic en «Nuevo check list».",
      "Selecciona el equipo, el tipo de mantención y el encargado.",
      "Marca cada ítem como SÍ, NO o N/A según la pauta.",
      "Guarda: el check list queda con estado Vigente y su número correlativo.",
    ],
    consejos: [
      "Este check list de taller (83 ítems) es distinto del checklist diario de Operación.",
      "Un check list se puede anular, pero no editar una vez guardado.",
      "Crear check list requiere rol Administrador o Supervisor.",
    ],
  },

  "/mantencion/certificado-mantencion": {
    titulo: "Certificados de Mantención",
    descripcion: "Documento que acredita que el equipo quedó en condiciones operativas.",
    paraQueSirve:
      "Emite el certificado que cierra el ciclo de mantención de un equipo, con el encargado y el correlativo, y lo descarga como PDF.",
    pasos: [
      "Haz clic en «Nuevo certificado».",
      "Selecciona el equipo y completa los datos del encargado.",
      "Emite el certificado: queda con estado Vigente y su número correlativo.",
      "Descarga el PDF desde el detalle del certificado.",
    ],
    consejos: [
      "El certificado toma una copia de los datos del equipo (tipo, marca, patente) al momento de emitirlo.",
      "Un certificado se puede anular, pero no editar una vez emitido.",
      "Emitir certificados requiere rol Administrador o Supervisor.",
    ],
  },

  "/mantencion/certificados": {
    titulo: "Vencimientos",
    descripcion: "Reporte de vencimientos de documentos de la flota por equipo.",
    paraQueSirve:
      "Muestra en un solo lugar el estado de SOAP, permiso de circulación, revisión técnica y extintor de cada equipo, para anticipar lo que está por vencer o vencido.",
    pasos: [
      "Revisa la tabla: cada equipo muestra sus cuatro documentos y su estado.",
      "Filtra por estado (Vigente, Por Vencer, Vencido) para priorizar.",
      "Actualiza las fechas en la ficha de cada equipo si algo cambió.",
      "Descarga el reporte completo con «Descargar PDF».",
    ],
    consejos: [
      "Las fechas no se editan aquí: se cargan en cada equipo, en el módulo Equipos.",
      "Un documento «Por Vencer» te da tiempo de renovar antes de que quede Vencido.",
      "Este reporte reemplazó al antiguo módulo de Certificados de vigencia.",
    ],
  },

  "/mantencion/reportes": {
    titulo: "Reportes de Mantención",
    descripcion: "Generación y exportación de datos de mantención por rango de fechas.",
    paraQueSirve:
      "Permite extraer los registros de mantención por equipo y período para revisarlos o exportarlos.",
    pasos: [
      "Elige el equipo y el tipo de reporte que necesitas.",
      "Define el rango de fechas (desde y hasta).",
      "Genera el reporte para ver los registros del período.",
    ],
    consejos: [
      "El rango de fechas es obligatorio: acota el período para no traer todo el historial.",
      "Los reportes se apoyan en los registros ya cargados en Operación y Mantención.",
    ],
  },

  // ── Módulo de Operación ───────────────────────────────────────────

  "/operacion": {
    titulo: "Módulo de Operación",
    descripcion: "Control diario de equipos y partes operacionales en terreno.",
    paraQueSirve:
      "Es el día a día en terreno: el registro de entrada/salida del equipo y el checklist pre-operacional. Estos registros alimentan luego los planes de mantención.",
    pasos: [
      "Revisa los indicadores de equipos y de actividad del día.",
      "Registra el parte diario de entrada/salida del equipo.",
      "Completa el checklist pre-operacional antes de operar.",
      "El supervisor revisa y aprueba los partes pendientes.",
    ],
    consejos: [
      "Los equipos los gestiona el módulo de Mantención; aquí solo los seleccionas.",
      "Si es tu primera vez, abre la Guía de uso para seguir el orden correcto.",
      "Los registros diarios son la base para planificar la mantención.",
    ],
  },

  "/operacion/partes-diarios": {
    titulo: "Partes Diarios",
    descripcion: "Registro diario de entrada y salida de uso del equipo (paso 1).",
    paraQueSirve:
      "Documenta el uso del equipo en la jornada: horómetro, odómetro, combustible, componentes revisados al ingreso y a la salida, responsables y observaciones. Es el paso 1 del ciclo de mantención.",
    pasos: [
      "Haz clic en «Nuevo parte» para registrar la entrada del equipo.",
      "Completa equipo, responsable, horómetro/odómetro, área de uso y centro de costo.",
      "Marca el estado de los componentes y adjunta las fotos que correspondan.",
      "Al cierre de jornada registra la salida y el receptor; el parte queda Pendiente de revisión.",
      "El supervisor lo revisa y lo Aprueba o Rechaza.",
    ],
    consejos: [
      "Un parte Pendiente lo aprueba o rechaza un Administrador o Supervisor.",
      "Descarga el PDF del registro desde el detalle del parte.",
      "Este registro puede usarse después para prellenar un plan de mantención.",
    ],
  },

  "/operacion/checklists": {
    titulo: "Checklists",
    descripcion: "Inspección pre-operacional del equipo antes de usarlo.",
    paraQueSirve:
      "Verifica que el equipo esté en condiciones antes de operar. Cada ítem se marca como OK o Falla y el resultado general queda como Apto o No Apto.",
    pasos: [
      "Haz clic en «Nuevo checklist».",
      "Selecciona el equipo y el operador.",
      "Marca cada ítem como OK o Falla.",
      "Guarda: el checklist queda con su resultado Apto o No Apto.",
    ],
    consejos: [
      "Un resultado No Apto indica que el equipo tiene una falla que revisar antes de operar.",
      "Este checklist diario es distinto del Check List de Mantenimiento del taller (83 ítems).",
      "Los equipos disponibles vienen del módulo de Mantención.",
    ],
  },

  // ── Guías de uso ──────────────────────────────────────────────────

  "/ayuda": {
    titulo: "Guía de uso · Módulo Comercial",
    descripcion: "El orden recomendado para trabajar el flujo comercial de principio a fin.",
    paraQueSirve:
      "Explica, paso a paso y en orden, cómo usar el módulo Comercial: desde configurar la empresa hasta emitir cotizaciones, contratos y órdenes de compra.",
    pasos: [
      "Sigue las tarjetas numeradas en el orden en que aparecen.",
      "Cada paso tiene un botón «Ir a…» para abrir la pantalla correspondiente.",
      "Revisa las Preguntas frecuentes al final si tienes dudas puntuales.",
    ],
    consejos: [
      "El botón de ayuda contextual (arriba a la derecha) explica la pantalla en la que estás.",
      "Empieza por Configuración y Empresas: el resto del flujo depende de esos datos.",
    ],
  },

  "/mantencion/ayuda": {
    titulo: "Guía de uso · Módulo de Mantención",
    descripcion: "El orden recomendado para planificar y ejecutar la mantención de la flota.",
    paraQueSirve:
      "Explica, paso a paso y en orden, cómo usar Mantención: dar de alta equipos, planificar, generar la orden de trabajo y llevar certificados y vencimientos.",
    pasos: [
      "Sigue las tarjetas numeradas en el orden en que aparecen.",
      "Cada paso tiene un botón «Ir a…» para abrir la pantalla correspondiente.",
      "Revisa las Preguntas frecuentes al final si tienes dudas puntuales.",
    ],
    consejos: [
      "Empieza por Equipos: sin la flota cargada no puedes planificar ni cotizar.",
      "El plan genera la orden de trabajo; la orden se ejecuta en el Taller.",
    ],
  },

  "/operacion/ayuda": {
    titulo: "Guía de uso · Módulo de Operación",
    descripcion: "El orden recomendado para el control diario de equipos en terreno.",
    paraQueSirve:
      "Explica, paso a paso y en orden, cómo usar Operación: el registro de entrada/salida y el checklist diario, y cómo alimentan la mantención.",
    pasos: [
      "Sigue las tarjetas numeradas en el orden en que aparecen.",
      "Cada paso tiene un botón «Ir a…» para abrir la pantalla correspondiente.",
      "Revisa las Preguntas frecuentes al final si tienes dudas puntuales.",
    ],
    consejos: [
      "Los equipos los gestiona Mantención; en Operación solo los seleccionas.",
      "Tus registros diarios son la base para planificar la mantención.",
    ],
  },
};

export function getHelpEntry(pathname: string): HelpEntry | null {
  // Recorremos de la key más larga a la más corta para preferir el match más
  // específico (ej: /mantencion/equipos gana sobre /mantencion). Sin esto, el
  // hub /mantencion capturaría todas sus subrutas por el prefijo.
  const keys = Object.keys(HELP_CONTENT).sort((a, b) => b.length - a.length);
  const match = keys.find(
    (key) => pathname === key || pathname.startsWith(`${key}/`)
  );
  return match ? (HELP_CONTENT[match] ?? null) : null;
}
