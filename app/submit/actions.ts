'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type SubmitState = {
  success: boolean
  error?: string
}

export async function submitEntry(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const entrant_name = (formData.get('entrant_name') as string | null)?.trim()
  const tier1 = parseInt(formData.get('tier1_golfer_id') as string)
  const tier2 = parseInt(formData.get('tier2_golfer_id') as string)
  const tier3 = parseInt(formData.get('tier3_golfer_id') as string)
  const tier4 = parseInt(formData.get('tier4_golfer_id') as string)
  const tier5 = parseInt(formData.get('tier5_golfer_id') as string)
  const tier6 = parseInt(formData.get('tier6_golfer_id') as string)
  const tiebreak = parseInt(formData.get('tiebreak_guess') as string)

  if (!entrant_name) return { success: false, error: 'Please enter your name.' }

  const tierIds = [tier1, tier2, tier3, tier4, tier5, tier6]
  if (tierIds.some(isNaN))
    return { success: false, error: 'Please select a golfer for each tier.' }

  if (isNaN(tiebreak))
    return { success: false, error: 'Please enter a valid tiebreak score.' }

  const supabase = await createClient()

  const { error } = await supabase.from('entries').insert({
    entrant_name,
    tier1_golfer_id: tier1,
    tier2_golfer_id: tier2,
    tier3_golfer_id: tier3,
    tier4_golfer_id: tier4,
    tier5_golfer_id: tier5,
    tier6_golfer_id: tier6,
    tiebreak_guess: tiebreak,
  })

  if (error) {
    console.error('submitEntry error:', error)
    return { success: false, error: 'Failed to submit. Please try again.' }
  }

  revalidatePath('/')
  return { success: true }
}
