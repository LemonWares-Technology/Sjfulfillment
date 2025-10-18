'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { HomeIcon, ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image 
            src="https://sjfulfillment.com/wp-content/uploads/2020/09/cropped-Main-Logo-white-886x.png" 
            loading="lazy" 
            alt="SJ Fulfillment Logo" 
            height={120} 
            width={150} 
            className="object-cover" 
          />
        </div>

        <div className="bg-white/30 backdrop-blur-md py-8 px-4 shadow-lg sm:rounded-[5px] sm:px-10">
          <div className="text-center">
            {/* 404 Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white/20 mb-6">
              <MagnifyingGlassIcon className="h-8 w-8 text-[#f08c17]" />
            </div>

            {/* 404 Title */}
            <h1 className="text-6xl font-bold text-[#f08c17] mb-2">
              404
            </h1>

            {/* Page Not Found Message */}
            <h2 className="text-2xl font-semibold text-white/90 mb-4">
              Page Not Found
            </h2>

            <p className="text-white/90 mb-8">
              Sorry, we couldn't find the page you're looking for. The page might have been moved, deleted, or you might have entered the wrong URL.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-[5px] shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#f08c17] to-orange-400 hover:from-orange-500 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f08c17]"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Go Back
              </button>

              <button
                onClick={() => router.push('/')}
                className="w-full flex justify-center items-center px-4 py-2 border border-white/30 rounded-[5px] shadow-sm text-sm font-medium text-white/90 bg-white/20 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f08c17]"
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Go Home
              </button>
            </div>

            {/* Helpful Links */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm text-white/70 mb-4">
                Here are some helpful links:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/welcome')}
                  className="block w-full text-sm text-[#f08c17] hover:text-orange-400 text-center font-medium"
                >
                  Login
                </button>
               
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
