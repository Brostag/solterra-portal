// Base Dexie local del módulo terreno (Operación/Mantención) — Nivel 1 offline.
// Solo borradores de formularios: persistencia best-effort en el dispositivo.
// Ver docs/offline-design.md §2. Nunca se importa desde código de servidor.

import Dexie, { type Table } from "dexie";

export type DraftFormType = "checklist-mant" | "parte" | "checklist-op";

export interface DraftRecord {
  id: string; // `${formType}:${draftKey}` (clave primaria)
  formType: DraftFormType;
  payload: unknown; // snapshot serializable del formulario
  updatedAt: number; // epoch ms — para expiración
  userId: string; // solo se restaura el borrador del mismo usuario
}

// Un borrador vive máximo 7 días desde su última edición.
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

class TerrenoDB extends Dexie {
  drafts!: Table<DraftRecord, string>;

  constructor() {
    super("solterra-terreno");
    this.version(1).stores({
      drafts: "&id, formType, updatedAt",
    });
  }
}

let db: TerrenoDB | null = null;

// Lazy: no instanciar Dexie durante el render SSR de componentes cliente.
function getDb(): TerrenoDB | null {
  if (typeof indexedDB === "undefined") return null;
  if (!db) db = new TerrenoDB();
  return db;
}

export function draftId(formType: DraftFormType, draftKey: string): string {
  return `${formType}:${draftKey}`;
}

export async function getDraft(id: string): Promise<DraftRecord | undefined> {
  const base = getDb();
  if (!base) return undefined;
  return base.drafts.get(id);
}

export async function putDraft(record: DraftRecord): Promise<void> {
  const base = getDb();
  if (!base) return;
  await base.drafts.put(record);
}

export async function deleteDraft(id: string): Promise<void> {
  const base = getDb();
  if (!base) return;
  await base.drafts.delete(id);
}

// Barrido de expiración: borra borradores con más de 7 días sin editar.
export async function sweepExpiredDrafts(): Promise<void> {
  const base = getDb();
  if (!base) return;
  const limite = Date.now() - DRAFT_TTL_MS;
  await base.drafts.where("updatedAt").below(limite).delete();
}
