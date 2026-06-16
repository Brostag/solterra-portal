// Componentes del Registro de Ingreso/Salida de Equipo (Departamento Maquinarias).
// Cada componente se evalúa en INGRESO y en SALIDA: SÍ / NO / NA + observación.
// Compartido por form (client), action (server) y detalle.

export type ComponenteKey =
  | "documentos"
  | "neumaticos_repuesto"
  | "gata"
  | "llave_rueda"
  | "triangulo"
  | "antena"
  | "encendedor"
  | "extintor"
  | "botiquin"
  | "gomas_piso"
  | "tapa_estanque"
  | "varilla_aceite"
  | "baliza"
  | "pertiga"
  | "cunas"
  | "radio"
  | "limpieza";

export const REGISTRO_COMPONENTES: { key: ComponenteKey; label: string }[] = [
  { key: "documentos", label: "Documentos" },
  { key: "neumaticos_repuesto", label: "Neumáticos repuesto" },
  { key: "gata", label: "Gata" },
  { key: "llave_rueda", label: "Llave rueda" },
  { key: "triangulo", label: "Triángulo" },
  { key: "antena", label: "Antena" },
  { key: "encendedor", label: "Encendedor" },
  { key: "extintor", label: "Extintor" },
  { key: "botiquin", label: "Botiquín" },
  { key: "gomas_piso", label: "Gomas de piso" },
  { key: "tapa_estanque", label: "Tapa estanque combustible" },
  { key: "varilla_aceite", label: "Varilla aceite motor" },
  { key: "baliza", label: "Baliza" },
  { key: "pertiga", label: "Pértiga" },
  { key: "cunas", label: "Cuñas" },
  { key: "radio", label: "Radio" },
  { key: "limpieza", label: "Limpieza" },
];

export const REGISTRO_COMPONENTE_KEYS: ComponenteKey[] =
  REGISTRO_COMPONENTES.map((c) => c.key);

export type ValorComponente = "SI" | "NO" | "NA";

// Valor de un componente en ingreso y salida + observaciones por momento.
export type ComponenteEstado = {
  ingreso: ValorComponente | null;
  salida: ValorComponente | null;
  obs_i?: string | null;
  obs_s?: string | null;
};

// Estructura del campo JSON `componentes`: { [key]: ComponenteEstado }
export type ComponentesData = Partial<Record<ComponenteKey, ComponenteEstado>>;

export const COMBUSTIBLE_OPCIONES = ["Vacío", "1/4", "1/2", "3/4", "Lleno"];
export const TIPO_MANTENCION_OPCIONES = ["A", "B", "C", "A-B", "A-B-C", "Correctiva"];
