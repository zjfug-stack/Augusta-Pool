'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function loginAdmin(formData: FormData) {
  const password = formData.get('password') as string
  if (password === process.env.ADMIN_PASSWORD) {
    const jar = await cookies()
    jar.set('admin_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 h
    })
  }
  redirect('/admin')
}

export async function logoutAdmin() {
  const jar = await cookies()
  jar.delete('admin_auth')
  redirect('/admin')
}

async function requireAdmin() {
  const jar = await cookies()
  if (jar.get('admin_auth')?.value !== process.env.ADMIN_PASSWORD) {
    redirect('/admin')
  }
}

// ─── Golfer mutations ────────────────────────────────────────────────────────

export async function updateGolfer(
  id: number,
  score: number,
  status: string
): Promise<{ error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('golfers')
    .update({ current_score: score, status })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/admin')
  return {}
}

// ─── Pool settings mutations ─────────────────────────────────────────────────

export async function updatePoolSettings(data: {
  submissions_open?: boolean
  winner_score?: number | null
  round_low_label?: string | null
}): Promise<{ error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('pool_settings').update(data).eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/admin')
  return {}
}
