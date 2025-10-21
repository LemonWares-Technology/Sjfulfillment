'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApi } from '@/app/lib/use-api'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { post, loading } = useApi()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    if (!searchParams) return
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      router.push('/login')
      return
    }
    setToken(tokenParam)
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      await post('/api/auth/reset-password', {
        token,
        password
      })
      setSuccess(true)
      setTimeout(() => {
        router.push('/welcome')
      }, 3000)
    } catch (error) {
      setError('Failed to reset password. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="w-full min-h-screen flex items-center flex-col justify-center text-white bg-[#0A0A0A]">
        <div>
          <Image 
            src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png"
            loading="lazy" 
            alt="SJFulfillment Logo" 
            height={120} 
            width={150} 
            className="object-cover" 
          />
        </div>
        <div className="my-5" />
        
        <div className="w-[500px] max-md:w-[95%] flex flex-col items-center px-8 py-8 rounded-[5px] bg-white/10 backdrop-blur-md h-auto">
          <div className="mx-auto h-12 w-12 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-[#f08c17] tracking-wide">
            Password Reset Successful
          </h2>
          <p className="mt-4 text-sm text-white/80 text-center">
            Your password has been reset successfully. You will be redirected to the login page shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen flex items-center flex-col justify-center text-white bg-[#0A0A0A]">
      <div>
        <Image 
          src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png"
          loading="lazy" 
          alt="SJFulfillment Logo" 
          height={120} 
          width={150} 
          className="object-cover" 
        />
      </div>
      <div className="my-5" />
      
      <div className="w-[500px] max-md:w-[95%] flex flex-col items-center px-4 py-6 rounded-[5px] bg-white/10 backdrop-blur-md h-auto">
        <div className="text-2xl tracking-wide font-semibold mb-2 text-[#f08c17]">Reset Your Password</div>
        <p className="text-sm text-white/70 mb-6 text-center">
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[40px] border-[#F08C17] border rounded-[5px] bg-white/5 px-3 pr-10 text-[#F08C17] placeholder:text-[#F08C17]/60 focus:outline-none focus:border-[#F08C17] focus:bg-white/10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-[#F08C17]/60" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-[#F08C17]/60" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-[40px] border-[#F08C17] border rounded-[5px] bg-white/5 px-3 pr-10 text-[#F08C17] placeholder:text-[#F08C17]/60 focus:outline-none focus:border-[#F08C17] focus:bg-white/10"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-[#F08C17]/60" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-[#F08C17]/60" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-[5px] bg-red-500/20 border border-red-500/30 p-3">
              <div className="text-sm text-red-200">{error}</div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-[5px] text-white bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => router.push('/welcome')}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-lg text-white/70">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

