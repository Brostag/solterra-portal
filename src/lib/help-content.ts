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
      "Cambia el estado según avance el proceso: Borrador → Emitida → Recibida → Pagada.",
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
};

export function getHelpEntry(pathname: string): HelpEntry | null {
  const keys = Object.keys(HELP_CONTENT);
  const match = keys.find(
    (key) => pathname === key || pathname.startsWith(`${key}/`)
  );
  return match ? (HELP_CONTENT[match] ?? null) : null;
}
