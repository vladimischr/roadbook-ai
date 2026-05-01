// ============================================================================
// Helper de retry sur "schema cache" miss — server-side uniquement
// ============================================================================
// Quand une migration vient juste d'être appliquée, PostgREST peut servir
// pendant quelques secondes/minutes une erreur "Could not find the table X
// in the schema cache" même si la table existe. Sa propagation NOTIFY est
// asynchrone.
//
// Ce helper exécute une requête Supabase, et si l'erreur matche le pattern
// "schema cache", il retry une fois après 1,5s. Idempotent et sans surcoût
// en cas de succès au premier coup.

const SCHEMA_CACHE_RE = /schema cache|could not find the (table|column|function)/i;

export async function withSchemaRetry<T extends { error: any }>(
  fn: () => Promise<T>,
  options: { delayMs?: number } = {},
): Promise<T> {
  const delayMs = options.delayMs ?? 1500;
  const first = await fn();
  if (!first.error) return first;
  if (!SCHEMA_CACHE_RE.test(String(first.error?.message ?? ""))) return first;
  await new Promise((r) => setTimeout(r, delayMs));
  return await fn();
}

export function isSchemaCacheError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && "message" in err
        ? String((err as any).message)
        : String(err);
  return SCHEMA_CACHE_RE.test(msg);
}
