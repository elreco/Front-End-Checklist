/** Normalize Supabase embedded to-one/to-many relations across PostgREST response shapes. */
export function normalizeRelation<T>(relation: T | T[] | null | undefined): T[] {
  if (Array.isArray(relation)) return relation
  return relation ? [relation] : []
}

/** Return the first embedded relation row regardless of its PostgREST response shape. */
export function firstRelation<T>(relation: T | T[] | null | undefined): T | undefined {
  return normalizeRelation(relation)[0]
}
