'use client'

import { useState } from 'react'
import { XMarkIcon, PhoneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { useApi } from '@/app/lib/use-api'

interface TelegramCallModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId?: string
  recipientName?: string
  recipientRole?: string
}

export default function TelegramCallModal({ 
  isOpen, 
  onClose, 
  recipientId, 
  recipientName = 'User',
  recipientRole = 'User'
}: TelegramCallModalProps) {
  const { post, loading } = useApi()
  const [isConnecting, setIsConnecting] = useState(false)
  const [telegramConnected, setTelegramConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInitiateCall = async () => {
    if (!recipientId) {
      setError('Recipient ID is required')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // First, send a message to initiate contact
      const response = await post('/api/telegram/call/initiate', {
        recipientId,
        recipientName,
        recipientRole,
        type: 'telegram_contact'
      })

      if (response?.success) {
        setTelegramConnected(true)
        // Show success message
        setTimeout(() => {
          onClose()
          setTelegramConnected(false)
        }, 3000)
      } else {
        setError(response?.error || 'Failed to initiate Telegram contact')
      }
    } catch (error: any) {
      console.error('Failed to initiate Telegram contact:', error)
      setError(error.message || 'Failed to initiate contact')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setTelegramConnected(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">
              Contact via Telegram
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {telegramConnected ? (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Contact Initiated!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                A Telegram message has been sent to {recipientName}. 
                They will receive a notification and can respond directly.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This is a messaging contact, not a voice call. 
                  The recipient will receive a Telegram message and can respond through the app.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Contact {recipientName}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Send a Telegram message to {recipientName} ({recipientRole}). 
                They will receive a notification and can respond directly through Telegram.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitiateCall}
                  disabled={loading || isConnecting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>
              This feature requires both users to have Telegram connected to their SJ Fulfillment accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
