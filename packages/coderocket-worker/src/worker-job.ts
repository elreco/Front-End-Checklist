/** Queue row narrowed to the two website-builder job kinds handled by this worker. */
export interface WorkerJob {
  attempts: number
  builder_site_id?: string | null
  id: string
  owner_id: string
  payload: Record<string, unknown>
}
