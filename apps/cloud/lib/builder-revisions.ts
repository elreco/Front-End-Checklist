/** Convert owner-scoped revision rows into the small Studio timeline shape. */
export function readBuilderRevisionSummaries(
  rows: Array<{ created_at: string; id: string; revision_number: number; title: string }> | null
) {
  return (rows ?? []).map(item => ({
    createdAt: item.created_at,
    id: item.id,
    revisionNumber: item.revision_number,
    title: item.title
  }))
}
