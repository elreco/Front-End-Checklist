'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eurosToMicroeuros, MAX_AI_OVERAGE_BUDGET_EUR } from '@/lib/billing'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Persist an authenticated paid account's opt-in monthly AI overage budget. */
export async function updateAiSpendingSettings(formData: FormData) {
  const selection = String(formData.get('budgetEuros') ?? '0')
  const selectedEuros =
    selection === 'custom' ? Number(formData.get('customBudgetEuros')) : Number(selection)
  if (
    !Number.isInteger(selectedEuros) ||
    selectedEuros < 0 ||
    selectedEuros > MAX_AI_OVERAGE_BUDGET_EUR
  )
    redirect('/settings/billing?notice=invalid-ai-budget')

  const supabase = await createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login?next=/settings/billing')
  const { error } = await supabase.rpc('cr_update_ai_spending_settings', {
    p_enabled: selectedEuros > 0,
    p_cap_microeur: eurosToMicroeuros(selectedEuros)
  })
  revalidatePath('/settings/billing')
  revalidatePath('/dashboard')
  redirect(`/settings/billing?notice=${error ? 'ai-budget-save-failed' : 'ai-budget-saved'}`)
}
