// Helpers DOM para borradores (Nivel 1 offline): leer/escribir los campos NO
// controlados (por atributo name) de un <form>. Los formularios de terreno
// mezclan FormData y useState, así que el snapshot necesita ambos mundos.

// Devuelve null si el <form> ya no está montado (ref desconectada durante el
// cleanup de desmontaje): el caller NO debe guardar un snapshot degradado.
export function leerCamposFormulario(
  form: HTMLFormElement | null,
  claves: readonly string[],
): Record<string, string> | null {
  if (!form) return null;
  const campos: Record<string, string> = {};
  const fd = new FormData(form);
  for (const k of claves) campos[k] = String(fd.get(k) ?? "");
  return campos;
}

export function aplicarCamposFormulario(
  form: HTMLFormElement | null,
  claves: readonly string[],
  campos: Record<string, string> | undefined,
): void {
  if (!form || !campos) return;
  for (const k of claves) {
    const valor = campos[k];
    if (valor === undefined) continue;
    const el = form.elements.namedItem(k);
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      el.value = valor;
    }
  }
}
