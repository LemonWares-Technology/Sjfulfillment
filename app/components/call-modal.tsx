'use client'

import React, { useState } from 'react'
import { useApi } from '@/app/lib/use-api'
import { PhoneIcon, VideoCameraIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface CallModalProps {
  isOpen: boolean
  onClose: () => void
  callType: 'audio' | 'video'
  contactInfo: {
    name: string
    phone: string
    email: string
    role: string
  }
}

export default function CallModal({ isOpen, onClose, callType, contactInfo }: CallModalProps) {
  const { post, loading } = useApi()
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended' | 'error'>('idle')
  const [error, setError] = useState('')

  const initiateCall = async () => {
    try {
      setCallStatus('calling')
      setError('')

      const response = await post('/api/services/call', {
        to: contactInfo.phone,
        type: callType,
        customerName: contactInfo.name,
        customerRole: contactInfo.role,
        notificationType: 'ORDER_UPDATE'
      })

      if (response?.success) {
        setCallStatus('connected')
      } else {
        throw new Error(response?.message || 'Failed to initiate call')
      }
    } catch (err: any) {
      console.error('Call initiation error:', err)
      setError(err.message || 'Failed to initiate call')
      setCallStatus('error')
    }
  }

  const handleEndCall = async () => {
    try {
      await post('/api/services/call/end', {
        to: contactInfo.phone
      })
    } catch (err) {
      console.error('Error ending call:', err)
    } finally {
      setCallStatus('ended')
      setTimeout(() => {
        onClose()
        setCallStatus('idle')
        setError('')
      }, 1000)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">
            {callType === 'video' ? 'Video Call' : 'Audio Call'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            {callType === 'video' ? (
              <VideoCameraIcon className="h-12 w-12 text-red-500" />
            ) : (
              <PhoneIcon className="h-12 w-12 text-green-500" />
            )}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
            {callStatus === 'idle' && `Call ${contactInfo.name}`}
            {callStatus === 'calling' && 'Initiating call...'}
            {callStatus === 'connected' && 'Call Connected'}
            {callStatus === 'ended' && 'Call Ended'}
            {callStatus === 'error' && 'Call Failed'}
          </h3>

          <div className="text-center mb-6">
            <p className="text-sm text-gray-500">{contactInfo.role}</p>
            <p className="text-sm text-gray-500">{contactInfo.phone}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-center space-x-3">
            {callStatus === 'idle' && (
              <>
                <button
                  onClick={initiateCall}
                  disabled={loading}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
                >
                  {loading ? 'Initiating...' : 'Start Call'}
                </button>
                <button
                  onClick={onClose}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                >
                  Cancel
                </button>
              </>
            )}

            {(callStatus === 'connected' || callStatus === 'calling') && (
              <button
                onClick={handleEndCall}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
              >
                End Call
              </button>
            )}

            {(callStatus === 'error' || callStatus === 'ended') && (
              <button
                onClick={onClose}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
