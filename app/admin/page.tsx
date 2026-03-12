import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { loginAdmin } from './actions'
import { AdminPanel } from './AdminPanel'
import type { Golfer, PoolSettings } from '@/lib/supabase/types'

export const metadata = { title: 'Admin · Masters Pool' }
// Don't cache the admin page
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const jar = await cookies()
  const isAuth = jar.get('admin_auth')?.value === process.env.ADMIN_PASSWORD

  if (!isAuth) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="text-center mb-6">
            <span className="text-4xl">🔐</span>
            <h1 className="text-xl font-bold text-masters-green mt-3">Admin Login</h1>
          </div>
          <form action={loginAdmin} className="space-y-4">
            <input
              type="password"
              name="password"
              required
              placeholder="Password"
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50 focus:border-masters-green"
            />
            <button
              type="submit"
              className="w-full py-2.5 bg-masters-green text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Log In
            </button>
          </form>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const [{ data: golferRows }, { data: settingsRows }] = await Promise.all([
    supabase
      .from('golfers')
      .select('id, name, tier, current_score, status')
      .order('tier')
      .order('name'),
    supabase.from('pool_settings').select('*').limit(1),
  ])

  const golfers = (golferRows ?? []) as Golfer[]
  const settings = (settingsRows?.[0] ?? {
    id: 1,
    submissions_open: true,
    winner_score: null,
    round_low_label: null,
  }) as PoolSettings

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-masters-green">Admin Panel</h1>
        <form action="/admin/logout" method="POST">
          <a
            href="/admin/logout"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Log out
          </a>
        </form>
      </div>
      <AdminPanel golfers={golfers} poolSettings={settings} />
    </div>
  )
}
