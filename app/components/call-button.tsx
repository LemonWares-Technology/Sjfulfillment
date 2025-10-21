'use client'

import { useState } from 'react'
import { PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import CallModal from './call-modal'

interface CallButtonProps {
  contactInfo: {
    name: string
    phone: string
    email?: string
    role?: string
  }
  variant?: 'audio' | 'video' | 'both'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function CallButton({ 
  contactInfo, 
  variant = 'both', 
  size = 'md',
  className = '' 
}: CallButtonProps) {
  const [isCallModalOpen, setIsCallModalOpen] = useState(false)
  const [callType, setCallType] = useState<'audio' | 'video'>('audio')

  const openCallModal = (type: 'audio' | 'video') => {
    setCallType(type)
    setIsCallModalOpen(true)
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        {variant === 'audio' || variant === 'both' ? (
          <button
            onClick={() => openCallModal('audio')}
            className={`${sizeClasses[size]} bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors`}
            title={`Call ${contactInfo.name}`}
          >
            <PhoneIcon className={iconSizes[size]} />
          </button>
        ) : null}

        {variant === 'video' || variant === 'both' ? (
          <button
            onClick={() => openCallModal('video')}
            className={`${sizeClasses[size]} bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full flex items-center justify-center hover:from-amber-600 hover:to-yellow-700 transition-colors`}
            title={`Video call ${contactInfo.name}`}
          >
            <VideoCameraIcon className={iconSizes[size]} />
          </button>
        ) : null}
      </div>

      {isCallModalOpen && (
        <CallModal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
          callType={callType}
          contactInfo={{
            name: contactInfo.name,
            phone: contactInfo.phone,
            email: contactInfo.email || '',
            role: contactInfo.role || 'Contact'
          }}
        />
      )}
    </>
  )
}
