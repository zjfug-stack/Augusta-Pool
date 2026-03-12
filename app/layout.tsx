import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Masters Pool',
  description: 'The Masters Tournament Golf Pool',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-masters-cream min-h-screen`}>
        <header className="bg-masters-green text-white shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90">
              <span className="text-xl font-bold tracking-tight text-white">⛳</span>
              <span className="text-lg font-bold tracking-tight">
                <span className="text-masters-gold">Masters</span> Pool
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/submit"
                className="text-sm font-semibold bg-masters-gold text-white px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity"
              >
                Submit Entry
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>

        <footer className="mt-12 py-6 border-t border-gray-200 text-center text-xs text-gray-400">
          Masters Pool · Not affiliated with Augusta National Golf Club
        </footer>
      </body>
    </html>
  )
}
