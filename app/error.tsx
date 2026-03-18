'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="text-5xl mb-4">⛳</div>
      <h2 className="text-xl font-bold text-masters-green mb-3">
        Something went wrong
      </h2>
      <p className="text-gray-600 text-sm mb-6">
        We&apos;re having trouble loading the page. Please try again in a moment.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2 bg-masters-green text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  )
}
