'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string, twoFactorToken?: string) => Promise<void>
  twoFactorEnabled: boolean
}

export default function DeleteAccountModal({ 
  isOpen, 
  onClose, 
  onConfirm,
  twoFactorEnabled 
}: DeleteAccountModalProps) {
  const [step, setStep] = useState(1)
  const [password, setPassword] = useState('')
  const [twoFactorToken, setTwoFactorToken] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleClose = () => {
    if (!isDeleting) {
      setStep(1)
      setPassword('')
      setTwoFactorToken('')
      setConfirmText('')
      onClose()
    }
  }

  const handleNext = () => {
    if (step === 1) {
      if (!password) {
        toast.error('Password is required')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (twoFactorEnabled && !twoFactorToken) {
        toast.error('2FA verification code is required')
        return
      }
      setStep(3)
    }
  }

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm')
      return
    }

    setIsDeleting(true)
    try {
      await onConfirm(password, twoFactorToken || undefined)
    } catch (error: any) {
      // Error is already displayed by the handler via toast
      setIsDeleting(false)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="absolute right-4 top-4">
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={handleClose}
                    disabled={isDeleting}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                    <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
                      Delete Account
                    </Dialog.Title>

                    {/* Step 1: Password */}
                    {step === 1 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                          This action will permanently delete your merchant account and all associated staff accounts. This cannot be undone.
                        </p>
                        <div className="mb-4">
                          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Enter your password to continue
                          </label>
                          <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                            placeholder="Your password"
                            autoFocus
                            disabled={isDeleting}
                          />
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-xs text-yellow-800">
                            <strong>Requirements:</strong> You must have no outstanding debts and all subscriptions must be inactive for at least 24 hours.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 2: 2FA (if enabled) */}
                    {step === 2 && twoFactorEnabled && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                          Enter your 2FA verification code to continue
                        </p>
                        <div className="mb-4">
                          <label htmlFor="twoFactorToken" className="block text-sm font-medium text-gray-700 mb-2">
                            2FA Verification Code
                          </label>
                          <input
                            type="text"
                            id="twoFactorToken"
                            value={twoFactorToken}
                            onChange={(e) => setTwoFactorToken(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                            placeholder="Enter code from authenticator app or backup code"
                            autoFocus
                            disabled={isDeleting}
                            maxLength={6}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          You can use a code from your authenticator app or one of your backup codes.
                        </p>
                      </div>
                    )}

                    {/* Step 3: Final Confirmation */}
                    {step === 3 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                          This is your final warning. Type <strong className="text-red-600">DELETE</strong> below to permanently delete your account.
                        </p>
                        <div className="mb-4">
                          <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-2">
                            Type DELETE to confirm
                          </label>
                          <input
                            type="text"
                            id="confirmText"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                            placeholder="DELETE"
                            autoFocus
                            disabled={isDeleting}
                          />
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-xs text-red-800">
                            <strong>Warning:</strong> All your data, products, orders, and staff accounts will be permanently deleted. This action cannot be reversed.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  {step > 1 && (
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={() => setStep(step - 1)}
                      disabled={isDeleting}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={handleClose}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  {step < 3 && (
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={handleNext}
                      disabled={isDeleting}
                    >
                      Next
                    </button>
                  )}
                  {step === 3 && (
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleDelete}
                      disabled={isDeleting || confirmText !== 'DELETE'}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
