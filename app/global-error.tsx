'use client'

import { useEffect } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                {/* Error Icon */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                </div>

                {/* Error Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Application Error
                </h1>

                {/* Error Message */}
                <p className="text-gray-600 mb-6">
                  A critical error occurred in the application. Please refresh the page or contact support if the problem persists.
                </p>

                {/* Error Details (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-6 p-4 bg-gray-100 rounded-md text-left">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Error Details:</h3>
                    <p className="text-xs text-gray-600 font-mono break-all">
                      {error.message}
                    </p>
                    {error.digest && (
                      <p className="text-xs text-gray-500 mt-2">
                        Error ID: {error.digest}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={reset}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-700 hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Try Again
                </button>

                {/* Support Information */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    If this error continues, please contact our support team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
