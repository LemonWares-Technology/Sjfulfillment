import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {onRetry && (
        <div className="mt-6">
          <button
            onClick={onRetry}
            className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}
