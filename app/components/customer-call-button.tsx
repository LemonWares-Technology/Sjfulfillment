'use client'
import React, { useState } from 'react'
import { PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import CallModal from './call-modal'

interface CustomerCallButtonProps {
  customer: {
    id: string
    name: string
    phone: string
    email: string
  }
  type: 'audio' | 'video'
  className?: string
  orderNumber?: string
}

export default function CustomerCallButton({ customer, type, className, orderNumber }: CustomerCallButtonProps) {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)

  const handleStartCall = () => {
    setIsCallModalOpen(true)
  }

  const handleEndCall = () => {
    setIsCallModalOpen(false)
  }

  const getCallTitle = () => {
    const callType = type === 'video' ? 'Video' : 'Audio'
    const orderInfo = orderNumber ? ` (Order #${orderNumber})` : ''
    return `Start ${callType} Call with ${customer.name}${orderInfo}`
  }

  return (
    <>
      <button
        onClick={handleStartCall}
        className={`p-2 rounded-full ${type === 'video' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${type === 'video' ? 'focus:ring-red-500' : 'focus:ring-green-500'} ${className || ''}`}
        title={getCallTitle()}
      >
        {type === 'video' ? (
          <VideoCameraIcon className="h-5 w-5" />
        ) : (
          <PhoneIcon className="h-5 w-5" />
        )}
      </button>
      {isCallModalOpen && (
        <CallModal
          isOpen={isCallModalOpen}
          onClose={handleEndCall}
          callType={type}
          contactInfo={{
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            role: orderNumber ? `Customer (Order #${orderNumber})` : 'Customer'
          }}
        />
      )}
    </>
  )
}
