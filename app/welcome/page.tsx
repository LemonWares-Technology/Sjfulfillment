"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from "next/image"
import Link from "next/link"
import { useAuth } from '@/app/lib/auth-context'
import toast from 'react-hot-toast'

export default function WelcomePage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    let isValid = true
    
    // Reset errors
    setEmailError('')
    setPasswordError('')

    // Validate email
    if (!email.trim()) {
      setEmailError('Email field cannot be left empty')
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      isValid = false
    }

    // Validate password
    if (!password) {
      setPasswordError('Password field cannot be left empty')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        if (data.data.requires2FA) {
          // Redirect to 2FA verification page
          router.push(`/login/2fa?token=${data.data.tempToken}`)
        } else {
          // Normal login - store token and trigger auth context refresh
          localStorage.setItem('token', data.data.token)
          toast.success('Welcome back!')
          
          // Use AuthContext's refreshUser to sync state and then navigate
          if (refreshUser) {
            await refreshUser()
          }
          
          // Navigate within SPA to preserve context
          router.replace(navigateToUserDashboard(data.data.user.role))
        }
      } else {
        toast.error(data.error || 'Login failed')
      }
    } catch (error) {
      toast.error('Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const navigateToUserDashboard = (role: string) => {
    switch (role) {
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
  }

  return (
    <div className="w-full min-h-screen flex items-center flex-col justify-center text-white bg-[#0A0A0A]">
      <div>
        <Image 
          src={`https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png`} 
          loading="lazy" 
          alt="Logo" 
          height={120} 
          width={150} 
          className="object-cover" 
        />
      </div>
      <div className="my-5" />
      
      <div className="w-[500px] max-md:w-[95%] flex flex-col items-center px-4 py-3 rounded-[5px] bg-white/10 h-auto">
        <div className="text-2xl tracking-wide font-semibold mb-3">Login Account</div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="w-full">
            <input 
              type="email" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (emailError) setEmailError('')
              }}
              disabled={isLoading}
              className="w-full h-[40px] border-[#F08C17] border rounded-[5px] bg-white/5 px-3 text-[#F08C17] placeholder:text-[#F08C17]/60 focus:outline-none focus:border-[#F08C17] focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed" 
              placeholder="Enter email address" 
            />
            <div className="h-[12px]">
              {emailError && (
                <div className="text-[12px] flex justify-end text-white">{emailError}</div>
              )}
            </div>
          </div>

          <div className="w-full mt-3">
            <input 
              type="password" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (passwordError) setPasswordError('')
              }}
              disabled={isLoading}
              className="w-full h-[40px] border-[#F08C17] border rounded-[5px] bg-white/5 px-3 text-[#F08C17] placeholder:text-[#F08C17]/60 focus:outline-none focus:border-[#F08C17] focus:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed" 
              placeholder="Enter password" 
            />
            <div className="h-[12px]">
              {passwordError && (
                <div className="text-[12px] flex justify-end text-white">{passwordError}</div>
              )}
            </div>
          </div>

          <div className="w-full mt-3 flex justify-end">
            <Link href="/forgot-password" className="w-fit hover:cursor-pointer hover:text-[#F08C17] transition-colors duration-300 ease-in-out">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="rounded-[5px] text-black tracking-wide font-semibold w-full h-[40px] bg-[#F08C17] mt-3 hover:cursor-pointer hover:bg-[#ff9b2a] transition-all ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Logging in...</span>
              </div>
            ) : (
              'Login'
            )}
          </button>

          <div className="mt-3 text-center">
            Don't have an account?{' '}
            <Link href={`/merchant-register`} className="text-[#F08C17] hover:cursor-pointer hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

