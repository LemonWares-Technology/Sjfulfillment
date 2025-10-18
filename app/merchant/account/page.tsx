'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/lib/auth-context'
import { useApi } from '@/app/lib/use-api'
import DashboardLayout from '@/app/components/dashboard-layout'
import PaymentGate from '@/app/components/payment-gate'
import { UserIcon, BuildingOfficeIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface MerchantAccount {
  id: string
  businessName: string
  businessEmail: string
  businessPhone: string
  contactPerson: string
  address: string
  city: string
  state: string
  country: string
  cacNumber?: string
  taxId?: string
  onboardingStatus: string
  createdAt: string
  updatedAt: string
}

interface UserAccount {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  createdAt: string
}

export default function MerchantAccountPage() {
  const { user } = useAuth()
  const { get, put, loading } = useApi()
  const [merchantData, setMerchantData] = useState<MerchantAccount | null>(null)
  const [userData, setUserData] = useState<UserAccount | null>(null)
  const [editingMerchant, setEditingMerchant] = useState(false)
  const [editingUser, setEditingUser] = useState(false)
  const [merchantForm, setMerchantForm] = useState<Partial<MerchantAccount>>({})
  const [userForm, setUserForm] = useState<Partial<UserAccount>>({})
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchAccountData()
  }, [])

  const fetchAccountData = async () => {
    try {
      if (user?.merchantId) {
        // Fetch merchant data
        const merchant = await get<MerchantAccount>(`/api/merchants/${user.merchantId}`)
        setMerchantData(merchant)
        setMerchantForm(merchant)
      }

      if (user?.id) {
        // Fetch user data
        const userAccount = await get<UserAccount>(`/api/users/${user.id}`)
        setUserData(userAccount)
        setUserForm(userAccount)
      }
    } catch (error) {
      console.error('Failed to fetch account data:', error)
      setErrors({ fetch: 'Failed to load account data. Please refresh the page.' })
    }
  }

  const handleMerchantSave = async () => {
    if (!merchantData?.id) {
      setErrors({ merchant: 'Merchant data not loaded. Please refresh the page.' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const updatedMerchant = await put(`/api/merchants/${merchantData.id}`, merchantForm)
      setMerchantData(updatedMerchant)
      setEditingMerchant(false)
    } catch (error) {
      console.error('Failed to update merchant:', error)
      setErrors({ merchant: 'Failed to update business information. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUserSave = async () => {
    if (!userData?.id) {
      setErrors({ user: 'User data not loaded. Please refresh the page.' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const updatedUser = await put(`/api/users/${userData.id}`, userForm)
      setUserData(updatedUser)
      setEditingUser(false)
    } catch (error) {
      console.error('Failed to update user:', error)
      setErrors({ user: 'Failed to update personal information. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMerchantCancel = () => {
    setMerchantForm(merchantData || {})
    setEditingMerchant(false)
    setErrors({})
  }

  const handleUserCancel = () => {
    setUserForm(userData || {})
    setEditingUser(false)
    setErrors({})
  }

  return (
    <PaymentGate userRole="MERCHANT_ADMIN">
      <DashboardLayout userRole="MERCHANT_ADMIN">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#f08c17]">Account Management</h1>
            <p className="mt-2 text-white/90">
              Manage your business and personal account information.
            </p>
          </div>

          {errors.fetch && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{errors.fetch}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Business Information */}
            <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px]">
              <div className="px-6 py-4 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-[#f08c17] mr-3" />
                    <h2 className="text-lg font-semibold text-[#f08c17]">Business Information</h2>
                  </div>
                  {!editingMerchant ? (
                    <button
                      onClick={() => setEditingMerchant(true)}
                      className="bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 text-white px-3 py-1 rounded-[5px] flex items-center shadow-md"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleMerchantSave}
                        disabled={isSubmitting}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-[5px] flex items-center"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={handleMerchantCancel}
                        className="bg-white/80 hover:bg-white/90 text-[#f08c17] px-3 py-1 rounded-[5px] flex items-center"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {errors.merchant && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.merchant}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Business Name
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.businessName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Business Email
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.businessEmail || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Business Phone
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.businessPhone || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Contact Person
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.contactPerson || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Business Address
                  </label>
                  <p className="text-white/90 font-bold">{merchantData?.address || '-'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      City
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.city || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      State
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.state || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Country
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.country || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      CAC Number
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.cacNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Tax ID
                    </label>
                    <p className="text-white/90 font-bold">{merchantData?.taxId || 'Not provided'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-[#f08c17]">Account Status:</span>
                      <span className={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        merchantData?.onboardingStatus === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      } bg-white/20`}>
                        {merchantData?.onboardingStatus}
                      </span>
                    </div>
                    <div className="text-sm text-white/70">
                      Created: {merchantData?.createdAt ? new Date(merchantData.createdAt).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-white/30 shadow-lg backdrop-blur-md rounded-[5px]">
              <div className="px-6 py-4 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserIcon className="h-6 w-6 text-[#f08c17] mr-3" />
                    <h2 className="text-lg font-semibold text-[#f08c17]">Personal Information</h2>
                  </div>
                  {!editingUser ? (
                    <button
                      onClick={() => setEditingUser(true)}
                      className="bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 text-white px-3 py-1 rounded-[5px] flex items-center shadow-md"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleUserSave}
                        disabled={isSubmitting}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-[5px] flex items-center"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Save
                      </button>
                      <button
                        onClick={handleUserCancel}
                        className="bg-white/80 hover:bg-white/90 text-[#f08c17] px-3 py-1 rounded-[5px] flex items-center"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 space-y-4">
                {errors.user && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{errors.user}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      First Name
                    </label>
                    <p className="text-white/90 font-bold">{userData?.firstName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Last Name
                    </label>
                    <p className="text-white/90 font-bold">{userData?.lastName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Email Address
                    </label>
                    <p className="text-white/90 font-bold">{userData?.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-1">
                      Phone Number
                    </label>
                    <p className="text-white/90 font-bold">{userData?.phone || '-'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-[#f08c17]">Role:</span>
                      <span className="ml-2 inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 bg-white/20">
                        {userData?.role}
                      </span>
                    </div>
                    <div className="text-sm text-white/70">
                      Member since: {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PaymentGate>
  )
}
