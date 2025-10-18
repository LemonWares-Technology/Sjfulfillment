'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheckIcon, KeyIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Image from 'next/image'

function TwoFactorAuthForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', ''])
  const [backupCodeInput, setBackupCodeInput] = useState('')
  const [isBackupCode, setIsBackupCode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempToken, setTempToken] = useState('')

  useEffect(() => {
    if (!searchParams) return

    
    
    const token = searchParams.get('token')
    if (!token) {
      toast.error('Invalid 2FA session')
      router.push('/login')
      return
    }
    setTempToken(token)
  }, [searchParams, router])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newCode = [...verificationCode]
    newCode[index] = value
    setVerificationCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      prevInput?.focus()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const code = isBackupCode ? backupCodeInput : verificationCode.join('')
    
    if (!code) {
      toast.error('Please enter the verification code')
      return
    }

    if (!isBackupCode && code.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    if (isBackupCode && code.length !== 8) {
      toast.error('Please enter a valid 8-character backup code')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tempToken,
          code: code.toUpperCase(),
          isBackupCode
        })
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('token', data.data.token)
        toast.success('2FA verification successful!')
        
        // Give time for localStorage to update
        setTimeout(() => {
          // Force a hard redirect to ensure fresh state
          const redirectUrl = (() => {
            switch (data.data.user.role) {
              case 'SJFS_ADMIN':
                return '/admin/dashboard'
              case 'MERCHANT_ADMIN':
                return '/merchant/dashboard'
              case 'MERCHANT_STAFF':
                return '/staff/dashboard'
              case 'WAREHOUSE_STAFF':
                return '/warehouse/dashboard'
              default:
                return '/dashboard'
            }
          })()
          
          // Use window.location.href for hard navigation to ensure auth context refreshes
          window.location.href = redirectUrl
        }, 200)
      } else {
        toast.error(data.error || 'Invalid verification code')
      }
    } catch (error) {
      toast.error('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className=" bg-black rounded-[5px] flex items-center justify-center mx-auto mb-4">
            <Image
              height={100}
              width={150}
              src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png"
              alt="SJF Logo"
              className="object-cover"
            />
          </div>
          <h2 className="text-3xl font-bold text-[#f08c17] mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-white">
            Enter your verification code to complete login
          </p>
        </div>

        {/* 2FA Form */}
        <div className="bg-white/30 rounded-[5px] shadow-sm border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {isBackupCode ? (
                  <KeyIcon className="h-12 w-12 text-white" />
                ) : (
                  <ShieldCheckIcon className="h-12 w-12 text-white" />
                )}
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                {isBackupCode ? 'Enter Backup Code' : 'Enter Verification Code'}
              </h3>
              
              <p className="text-sm text-white mb-4">
                {isBackupCode 
                  ? 'Enter one of your 8-character backup codes'
                  : 'Open your authenticator app and enter the 6-digit code'
                }
              </p>
            </div>

            <div>
              {isBackupCode ? (
                <input
                  type="text"
                  value={backupCodeInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\s/g, '').toUpperCase()
                    setBackupCodeInput(value.slice(0, 8))
                  }}
                  placeholder="ABCD1234"
                  className="w-full text-center text-2xl font-mono px-4 py-3 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  maxLength={8}
                  autoComplete="one-time-code"
                />
              ) : (
                <div className="flex gap-2 justify-center">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      autoComplete="off"
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || (!isBackupCode && verificationCode.join('').length !== 6) || (isBackupCode && backupCodeInput.length !== 8)}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-3 px-4 rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsBackupCode(!isBackupCode)
                  setVerificationCode(['', '', '', '', '', ''])
                  setBackupCodeInput('')
                }}
                className="text-sm text-amber-600 hover:text-amber-500"
              >
                {isBackupCode ? 'Use authenticator app instead' : 'Use backup code instead'}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push('/welcome')}
                className="text-sm text-white hover:text-gray-300"
              >
                ← Back to login
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="bg-amber-50 border border-amber-200 rounded-[5px] p-4">
          <div className="flex">
            <ShieldCheckIcon className="h-5 w-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-amber-800 font-medium mb-1">Security Notice</p>
              <p className="text-amber-700">
                This additional security step helps protect your account. 
                {!isBackupCode && ' If you don\'t have access to your authenticator app, you can use a backup code.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 flex items-center justify-center">
      <div className="text-center">
        <div className="h-16 w-16 bg-black rounded-[5px] flex items-center justify-center mx-auto mb-4">
          <img
            src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png"
            alt="SJF Logo"
            className="h-10 w-10 object-contain"
          />
        </div>
        <p className="text-gray-600">Loading 2FA verification...</p>
      </div>
    </div>
  )
}

export default function TwoFactorAuthPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TwoFactorAuthForm />
    </Suspense>
  )
}