import { createServiceClient } from '@coderocket/db'

interface ActiveJobIdentity {
  id: string
  owner_id: string
}

/** Signal that an owner stopped a job while its worker was still processing it. */
export class JobCancelledError extends Error {
  constructor() {
    super('Job was cancelled by its owner')
    this.name = 'JobCancelledError'
  }
}

/** Refuse another expensive or persistent step after an owner-requested cancellation. */
export async function assertJobActive(job: ActiveJobIdentity): Promise<void> {
  const { data, error } = await createServiceClient()
    .from('cr_jobs')
    .select('id')
    .eq('id', job.id)
    .eq('owner_id', job.owner_id)
    .eq('status', 'leased')
    .is('cancelled_at', null)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new JobCancelledError()
}
