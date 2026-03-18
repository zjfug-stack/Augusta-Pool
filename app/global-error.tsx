'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '5rem 1rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⛳</div>
        <h2 style={{ color: '#076652', marginBottom: '0.75rem' }}>Something went wrong</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          A critical error occurred. Please reload the page.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.5rem 1.25rem',
            background: '#076652',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </body>
    </html>
  )
}
