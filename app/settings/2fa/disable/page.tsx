'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import DashboardLayout from '@/app/components/dashboard-layout'
import { 
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const showToast = (message: string, type: "success" | "error" = "success") => {
  try {
    if (typeof toast !== 'undefined') {
      toast[type](message)
    } else {
      console[type === 'error' ? 'error' : 'log'](message)
    }
  } catch (error) {
    console.log(message);
  }
}

export default function Disable2FAPage() {
  const { user, refreshUser } = useAuth()
  const { post, loading } = useApi()
  const router = useRouter()
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return

    const newCode = [...verificationCode]
    newCode[index] = value
    setVerificationCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`disable-code-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`disable-code-${index - 1}`)
      prevInput?.focus()
    }
  }

  const disable2FA = async () => {
    const code = verificationCode.join('')

    if (!code || code.length !== 6) {
      showToast('Please enter a valid 6-digit code', 'error')
      return
    }

    if (!password) {
      showToast('Please enter your password', 'error')
      return
    }

    try {
      await post('/api/auth/2fa/disable', {
        token: code,
        password
      })
      
      // Force immediate user context refresh
      if (refreshUser) {
        await refreshUser()
      }
      
      showToast('2FA disabled successfully!', 'success')
      
      // Force a hard navigation to ensure fresh state
  window.location.href = '/settings?tab=security'
    } catch (error) {
      showToast('Invalid verification code or password', 'error')
    }
  }

  const handleCancel = () => {
    router.push('/settings?tab=security')
  }

  return (
    <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
      <div>
        <div onClick={() => { router.back() }} className="text-[#f08c17] px-4 py-2 border border-[#f08c17] rounded-[5px] w-fit hover:cursor-pointer">Back</div>

        <div className="text-[#f08c17] text-2xl font-semibold tracking-wide my-3">Disable 2 Factor Authentication</div>
        <div className="w-full bg-white/30 px-5 py-2 rounded-[5px]">
          <div className="w-[500px] max-md:w-full">
            {/* Disable Section */}
            <p className="text-gray-100 text-base">Disable Two-Factor Authentication</p>
            <p className="text-white text-[14px]">This will reduce your account security. We recommend keeping 2FA enabled.</p>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-[5px] p-4 my-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-red-800 mb-1">Warning:</p>
                  <p className="text-sm text-red-700">
                    Disabling 2FA will make your account less secure. You'll only need your password to log in.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1 */}
            <div className="mt-4">
              <div className="">
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-4 text-[14px] py-1 border-[#f08c17] text-[#f08c17] rounded-full border">Step 1</div>
                  <div className="text-gray-200 font-semibold">Enter Your Password</div>
                </div>
                <p className="my-3 text-gray-200">Confirm your identity by entering your current account password.</p>
              </div>

              <div className="mt-3">
                <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 bg-white/30 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                />
              </div>
            </div>

            {/* Step 2 */}
            <div className="mt-6">
              <div className="">
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-4 text-[14px] py-1 border-[#f08c17] text-[#f08c17] rounded-full border">Step 2</div>
                  <div className="text-gray-200 font-semibold">Enter Verification Code</div>
                </div>
                <p className="my-3 text-gray-200">Enter the 6-digit code from your authenticator app to confirm.</p>
              </div>
            </div>

            {/* Enter verification code */}
            <div className="font-semibold tracking-wide text-gray-200">Enter verification code</div>
            <div className="flex gap-2 my-3">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  id={`disable-code-${index}`}
                  value={digit}
                  type="text"
                  autoCorrect="off"
                  autoSave="off"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 caret-[#f08c17] h-12 text-center text-xl font-semibold border border-gray-300 bg-white/30 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#f08c17] focus:border-transparent"
                />
              ))}
            </div>

            <div className="mt-4">
              <div className="flex mt-3 items-center gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  className="border px-4 py-2 rounded-[5px] bg-gray-400 text-black"
                >
                  Cancel
                </button>
                <button
                  onClick={disable2FA}
                  disabled={loading || verificationCode.join('').length !== 6 || !password}
                  className="bg-red-600 hover:bg-red-700 rounded-[5px] px-4 py-2 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
