'use client'

import { CheckCircleIcon, ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function MerchantRegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-[#f08c17] mb-4" />
          <h1 className="text-3xl font-bold text-gray-200 mb-2">
            Registration Successful!
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            Your merchant account has been created and approved automatically!
          </p>
        </div>

        <div className="bg-white/30 rounded-[5px] shadow-lg p-6 space-y-6">
          <div className="flex items-start space-x-3">
            {/* <ClockIcon className="max-h-6 max-w-6 text-amber-500 mt-1" /> */}
            <div>
              <h3 className="font-semibold text-gray-200">Next step: Select services</h3>
              <p className="text-gray-200 text-sm mt-1">
                Login and select the services you want access to. You'll pay daily for your selected services.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            {/* <EnvelopeIcon className="max-h-6 max-w-6 text-[#f08c17] mt-1" /> */}
            <div>
              <h3 className="font-semibold text-gray-200">Account approved</h3>
              <p className="text-gray-200 text-sm mt-1">
                Your account is automatically approved. No waiting required!
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            {/* <CheckCircleIcon className="max-h-6 max-w-6 text-[#f08c17] mt-1" /> */}
            <div>
              <h3 className="font-semibold text-gray-200">After service selection</h3>
              <p className="text-gray-200 text-sm mt-1">
                You'll have access to only the services you select. Daily charges will be accumulated and paid via cash on delivery.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <Link
            href="/welcome"
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-medium py-3 px-4 rounded-[5px] inline-block"
          >
            Login & Select Services
          </Link>
          
          <p className="text-sm text-gray-200">
            Need help?{' '}
            <a href="mailto:support@sjfulfillment.com" className="text-amber-600 hover:text-amber-700">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
