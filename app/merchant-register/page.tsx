'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/app/lib/use-api'
import { BuildingOfficeIcon, UserIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import { NIGERIA_STATES } from '@/app/data/nigeria-states'

interface MerchantData {
  businessName: string
  businessType: string
  businessEmail: string
  businessPhone: string
  contactPerson: string
  address: string
  city: string
  state: string
  country: string
  cacNumber: string
  taxId: string
}

interface UserData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export default function MerchantRegistrationPage() {
  const router = useRouter()
  const { post, loading } = useApi()
  const [currentStep, setCurrentStep] = useState(1)
  const [merchantData, setMerchantData] = useState<MerchantData>({
    businessName: '',
    businessType: '',
    businessEmail: '',
    businessPhone: '',
    contactPerson: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    cacNumber: '',
    taxId: ''
  })
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Prefill step 2 with step 1 details where sensible
  useEffect(() => {
    // When merchantData.contactPerson is provided, split into first/last name if userData empty
    if (currentStep === 2) {
      if (!userData.firstName && merchantData.contactPerson) {
        const parts = merchantData.contactPerson.trim().split(/\s+/)
        const firstName = parts[0] || ''
        const lastName = parts.slice(1).join(' ') || ''
        setUserData((prev) => ({ ...prev, firstName, lastName }))
      }
      // Use businessEmail and businessPhone as defaults if user email/phone are empty
      setUserData((prev) => ({
        ...prev,
        email: prev.email || merchantData.businessEmail,
        phone: prev.phone || merchantData.businessPhone,
      }))
    }
  }, [currentStep])

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {}

    if (!merchantData.businessName) newErrors.businessName = 'Business name is required'
    if (!merchantData.businessEmail) newErrors.businessEmail = 'Business email is required'
    else if (!/\S+@\S+\.\S+/.test(merchantData.businessEmail)) newErrors.businessEmail = 'Invalid email format'
    if (!merchantData.businessPhone) newErrors.businessPhone = 'Business phone is required'
    if (!merchantData.contactPerson) newErrors.contactPerson = 'Contact person is required'
    if (!merchantData.address) newErrors.address = 'Address is required'
    if (!merchantData.city) newErrors.city = 'City is required'
    if (!merchantData.state) newErrors.state = 'State is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {}

    if (!userData.firstName) newErrors.firstName = 'First name is required'
    if (!userData.lastName) newErrors.lastName = 'Last name is required'
    if (!userData.email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(userData.email)) newErrors.email = 'Invalid email format'
    if (!userData.phone) newErrors.phone = 'Phone number is required'
    if (!userData.password) newErrors.password = 'Password is required'
    else if (userData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (userData.password !== userData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    try {
      const response = await post('/api/merchants/register-public', {
        merchant: merchantData,
        user: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phone: userData.phone,
          password: userData.password
        }
      })

      // Redirect to success page
      router.push('/merchant-registration-success')
    } catch (error) {
      console.error('Registration failed:', error)
      setErrors({ submit: 'Registration failed. Please try again.' })
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className='my-4'>
            <Image alt='SJF Logo' loading='lazy' src={`https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png`} height={100} width={150} className='object-cover' />
          </div>
          <p className="text-lg text-gray-300">
            Register your business and start fulfilling orders
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-8">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-amber-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                1
              </div>
              <span className="ml-2 font-medium">Business Info</span>
            </div>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-gradient-to-r from-amber-500 to-yellow-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-amber-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white' : 'bg-gray-300 text-gray-200'
                }`}>
                2
              </div>
              <span className="ml-2 font-medium">Account Setup</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/30 rounded-[5px] shadow-lg p-8">
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-300 mb-6 flex items-center">
                <BuildingOfficeIcon className="h-6 w-6 mr-2 text-white" />
                Business Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={merchantData.businessName}
                    onChange={(e) => setMerchantData({ ...merchantData, businessName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.businessName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Your business name"
                  />
                  {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Business Type * (What does your business do?)
                  </label>
                  <select
                    value={merchantData.businessType}
                    onChange={(e) => setMerchantData({ ...merchantData, businessType: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.businessType ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select business type</option>
                    <option value="E-commerce">E-commerce/Online Store</option>
                    <option value="Retail">Retail Store</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Fashion & Apparel">Fashion & Apparel</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Health & Beauty">Health & Beauty</option>
                    <option value="Books & Media">Books & Media</option>
                    <option value="Home & Garden">Home & Garden</option>
                    <option value="Sports & Fitness">Sports & Fitness</option>
                    <option value="Automotive">Automotive</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Toys & Games">Toys & Games</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.businessType && <p className="text-red-500 text-sm mt-1">{errors.businessType}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    value={merchantData.businessEmail}
                    onChange={(e) => setMerchantData({ ...merchantData, businessEmail: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.businessEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="business@example.com"
                  />
                  {errors.businessEmail && <p className="text-red-500 text-sm mt-1">{errors.businessEmail}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Business Phone *
                  </label>
                  <input
                    type="tel"
                    value={merchantData.businessPhone}
                    onChange={(e) => setMerchantData({ ...merchantData, businessPhone: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.businessPhone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="+234 800 000 0000"
                  />
                  {errors.businessPhone && <p className="text-red-500 text-sm mt-1">{errors.businessPhone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Contact Person *
                  </label>
                  <input
                    type="text"
                    value={merchantData.contactPerson}
                    onChange={(e) => setMerchantData({ ...merchantData, contactPerson: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Full name of contact person"
                  />
                  {errors.contactPerson && <p className="text-red-500 text-sm mt-1">{errors.contactPerson}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Business Address *
                  </label>
                  <textarea
                    value={merchantData.address}
                    onChange={(e) => setMerchantData({ ...merchantData, address: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Complete business address"
                  />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={merchantData.city}
                    onChange={(e) => setMerchantData({ ...merchantData, city: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="City"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    State *
                  </label>
                  <select
                    value={merchantData.state}
                    onChange={(e) => setMerchantData({ ...merchantData, state: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select state</option>
                    {NIGERIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    CAC Number
                  </label>
                  <input
                    type="text"
                    value={merchantData.cacNumber}
                    onChange={(e) => setMerchantData({ ...merchantData, cacNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="RC Number (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={merchantData.taxId}
                    onChange={(e) => setMerchantData({ ...merchantData, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Tax ID (optional)"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-medium py-2 px-6 rounded-[5px]"
                >
                  Next Step
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-200 mb-6 flex items-center">
                <UserIcon className="h-6 w-6 mr-2 text-amber-600" />
                Account Setup
              </h2>

              <p className="text-xs text-gray-300 mb-4">We prefilled your details from Business Information where possible. You can edit them here.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={userData.firstName}
                    onChange={(e) => setUserData({ ...userData, firstName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.firstName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Your first name"
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={userData.lastName}
                    onChange={(e) => setUserData({ ...userData, lastName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.lastName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Your last name"
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="your@email.com"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={userData.phone}
                    onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="+234 800 000 0000"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={userData.password}
                    onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Minimum 8 characters"
                  />
                  {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={userData.confirmPassword}
                    onChange={(e) => setUserData({ ...userData, confirmPassword: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-[5px] focus:outline-none focus:ring-2 focus:ring-amber-500 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              {errors.submit && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-[5px]">
                  <p className="text-red-600">{errors.submit}</p>
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="bg-gray-400 hover:bg-gray-400 text-gray-200 font-medium py-2 px-6 rounded-[5px]"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-[#f08c17]  text-white font-medium py-2 px-6 rounded-[5px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <LockClosedIcon className="h-5 w-5 mr-2" />
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-300">
            Already have an account?{' '}
            <a href="/welcome" className="text-amber-600 hover:text-amber-700 font-medium">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
