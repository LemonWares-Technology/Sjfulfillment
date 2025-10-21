'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  // Text confirmation
  confirmPlaceholder?: string
  expectedText?: string // text user must type to confirm
  requireTextConfirm?: boolean // when true, show text input and enforce expectedText
  requirePassword?: boolean // when true, ask for a password and pass it to onConfirm
  passwordLabel?: string
  onConfirm: (password?: string) => Promise<void>
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  title = 'Confirm Deletion',
  description = 'This action is permanent and cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmPlaceholder = 'Type to confirm',
  expectedText = 'DELETE',
  requireTextConfirm = true,
  requirePassword = false,
  passwordLabel = 'Enter your password',
  onConfirm,
}: Props) {
  const [input, setInput] = useState('')
  const [password, setPassword] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    if (requireTextConfirm) {
      if (input !== expectedText) {
        toast.error(`Please type ${expectedText} to confirm`)
        return
      }
    }

    if (requirePassword && !password) {
      toast.error('Password is required')
      return
    }

    setIsProcessing(true)
    try {
      await onConfirm(password || undefined)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete')
      setIsProcessing(false)
      return
    }
  }

  const close = () => {
    if (!isProcessing) {
      setInput('')
      setPassword('')
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={close}>
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
                    onClick={close}
                    disabled={isProcessing}
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
                      {title}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>

                    {requirePassword && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{passwordLabel}</label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isProcessing}
                        />
                      </div>
                    )}

                    {requireTextConfirm && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder={confirmPlaceholder}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={isProcessing}
                        />
                      </div>
                    )}

                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={close}
                    disabled={isProcessing}
                  >
                    {cancelLabel}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    onClick={handleConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Deleting...' : confirmLabel}
                  </button>
                </div>

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
