'use client'

import DashboardLayout from "@/app/components/dashboard-layout";
import { useAuth } from "@/app/lib/auth-context"
import { useApi } from "@/app/lib/use-api";
import { CheckCircleIcon, ClipboardIcon, DocumentDuplicateIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";

// import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'
// import { useAuth } from '@/app/lib/auth-context'
// import { useApi } from '@/app/lib/use-api'
// import DashboardLayout from '@/app/components/dashboard-layout'
// import {
//   XMarkIcon,
//   DocumentDuplicateIcon,
//   ExclamationTriangleIcon,
//   CheckCircleIcon
// } from '@heroicons/react/24/outline'
// import toast from 'react-hot-toast'

// // Safe toast wrapper
// const showToast = (message: string, type: 'success' | 'error' = 'success') => {
//   try {
//     if (typeof toast !== 'undefined') {
//       toast[type](message)
//     } else {
//       console[type === 'error' ? 'error' : 'log'](message)
//     }
//   } catch (error) {
//     console.log(message)
//   }
// }

// export default function Setup2FAPage() {
//   const { user, refreshUser } = useAuth()
//   const { post, loading } = useApi()
//   const router = useRouter()
//   const [qrCode, setQrCode] = useState('')
//   const [secret, setSecret] = useState('')
//   const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', ''])
//   const [backupCodes, setBackupCodes] = useState<string[]>([])
//   const [showBackupCodes, setShowBackupCodes] = useState(false)

//   useEffect(() => {
//     generateQRCode()
//   }, [])

//   const generateQRCode = async () => {
//     try {
//       const response = await post('/api/auth/2fa/setup')
//       setQrCode(response.qrCode)
//       setSecret(response.secret)
//     } catch (error) {
//       showToast('Failed to generate 2FA setup', 'error')
//     }
//   }

//   const copyCode = () => {
//     navigator.clipboard.writeText(secret)
//     showToast('Secret code copied!', 'success')
//   }

//   const copyBackupCodes = () => {
//     navigator.clipboard.writeText(backupCodes.join('\n'))
//     showToast('Backup codes copied!', 'success')
//   }

//   const handleCodeChange = (index: number, value: string) => {
//     if (value.length > 1) return

//     const newCode = [...verificationCode]
//     newCode[index] = value
//     setVerificationCode(newCode)

//     // Auto-focus next input
//     if (value && index < 5) {
//       const nextInput = document.getElementById(`code-${index + 1}`)
//       nextInput?.focus()
//     }
//   }

//   const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
//     if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
//       const prevInput = document.getElementById(`code-${index - 1}`)
//       prevInput?.focus()
//     }
//   }

//   const verifyAndEnable2FA = async () => {
//     const code = verificationCode.join('')

//     if (code.length !== 6) {
//       showToast('Please enter a valid 6-digit code', 'error')
//       return
//     }

//     try {
//       const response = await post('/api/auth/2fa/verify', {
//         token: code,
//         secret
//       })

//       setBackupCodes(response.backupCodes)
//       setShowBackupCodes(true)
//       showToast('2FA enabled successfully!', 'success')
//     } catch (error) {
//       showToast('Invalid verification code', 'error')
//       setVerificationCode(['', '', '', '', '', ''])
//       document.getElementById('code-0')?.focus()
//     }
//   }

//   const handleFinish = async () => {
//     // Refresh user and redirect
//     if (refreshUser) {
//       await refreshUser()
//     }
//     window.location.href = '/settings'
//   }

//   const handleCancel = () => {
//     router.push('/settings')
//   }

//   return (
//     <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
//       <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
//         <div className="max-w-md w-full">
//           {!showBackupCodes ? (
//             // Main 2FA Setup Card
//             <div className="bg-white rounded-[5px] shadow-lg p-8 relative">
//               {/* Close button */}
//               <button
//                 onClick={handleCancel}
//                 className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
//               >
//                 <XMarkIcon className="h-6 w-6" />
//               </button>

//               {/* Header */}
//               <div className="mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900">
//                   Setup Authenticator App
//                 </h1>
//                 <p className="mt-2 text-sm text-gray-600">
//                   Each time you log in, in addition to your password, you'll use an authenticator app to generate a one-time code.
//                 </p>
//               </div>

//               {/* Step 1: Scan QR code */}
//               <div className="mb-6">
//                 <div className="flex items-center mb-3">
//                   <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium mr-2">
//                     1
//                   </span>
//                   <h2 className="text-base font-semibold text-gray-900">
//                     Scan QR code
//                   </h2>
//                 </div>
//                 <p className="text-sm text-gray-600 ml-8 mb-4">
//                   Scan the QR code below or manually enter the secret key into your authenticator app.
//                 </p>

//                 {qrCode && (
//                   <div className="ml-8 mb-4">
//                     <div className="bg-white p-4 rounded-[5px] border border-gray-200 inline-block">
//                       <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
//                     </div>
//                   </div>
//                 )}

//                 <div className="ml-8 bg-gray-50 rounded-[5px] p-4 border border-gray-200">
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-xs text-gray-500 mb-1">Can't scan QR code?</p>
//                       <p className="text-xs text-gray-500 mb-2">Enter this secret instead:</p>
//                       <code className="text-sm font-mono text-gray-900 break-all">
//                         {secret}
//                       </code>
//                     </div>
//                     <button
//                       onClick={copyCode}
//                       className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
//                       title="Copy code"
//                     >
//                       <DocumentDuplicateIcon className="h-5 w-5" />
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               {/* Step 2: Get verification Code */}
//               <div className="mb-8">
//                 <div className="flex items-center mb-3">
//                   <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium mr-2">
//                     2
//                   </span>
//                   <h2 className="text-base font-semibold text-gray-900">
//                     Get verification Code
//                   </h2>
//                 </div>
//                 <p className="text-sm text-gray-600 ml-8 mb-4">
//                   Enter the 6-digit code you see in your authenticator app.
//                 </p>

//                 <div className="ml-8">
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Enter verification code
//                   </label>
//                   <div className="flex gap-2">
//                     {verificationCode.map((digit, index) => (
//                       <input
//                         key={index}
//                         id={`code-${index}`}
//                         type="text"
//                         inputMode="numeric"
//                         maxLength={1}
//                         value={digit}
//                         onChange={(e) => handleCodeChange(index, e.target.value.replace(/\D/g, ''))}
//                         onKeyDown={(e) => handleKeyDown(index, e)}
//                         className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                       />
//                     ))}
//                   </div>
//                 </div>
//               </div>

//               {/* Action buttons */}
//               <div className="flex justify-end gap-3">
//                 <button
//                   onClick={handleCancel}
//                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={verifyAndEnable2FA}
//                   disabled={loading || verificationCode.join('').length !== 6}
//                   className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {loading ? 'Verifying...' : 'Confirm'}
//                 </button>
//               </div>
//             </div>
//           ) : (
//             // Backup Codes Card
//             <div className="bg-white rounded-[5px] shadow-lg p-8 relative">
//               {/* Success Icon */}
//               <div className="flex justify-center mb-6">
//                 <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
//                   <CheckCircleIcon className="h-10 w-10 text-green-600" />
//                 </div>
//               </div>

//               {/* Header */}
//               <div className="text-center mb-6">
//                 <h1 className="text-2xl font-bold text-gray-900 mb-2">
//                   2FA Enabled Successfully!
//                 </h1>
//                 <p className="text-sm text-gray-600">
//                   Save these backup codes in a safe place
//                 </p>
//               </div>

//               {/* Warning */}
//               <div className="bg-yellow-50 border border-yellow-200 rounded-[5px] p-4 mb-6">
//                 <div className="flex items-start">
//                   <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
//                   <div className="text-left">
//                     <p className="text-sm font-medium text-yellow-800 mb-1">Important:</p>
//                     <p className="text-sm text-yellow-700">
//                       Each backup code can only be used once. Store them securely and don't share them with anyone.
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {/* Backup Codes */}
//               <div className="mb-6">
//                 <div className="flex items-center justify-between mb-3">
//                   <h2 className="text-sm font-semibold text-gray-900">
//                     Your Backup Codes
//                   </h2>
//                   <button
//                     onClick={copyBackupCodes}
//                     className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
//                   >
//                     <DocumentDuplicateIcon className="h-4 w-4" />
//                     Copy all
//                   </button>
//                 </div>
//                 <div className="bg-gray-50 p-4 rounded-[5px] border border-gray-200">
//                   <div className="grid grid-cols-2 gap-2">
//                     {backupCodes.map((code, index) => (
//                       <div
//                         key={index}
//                         className="bg-white px-3 py-2 rounded border border-gray-200 text-center font-mono text-sm text-gray-900"
//                       >
//                         {code}
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </div>

//               {/* Action button */}
//               <button
//                 onClick={handleFinish}
//                 className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//               >
//                 Done
//               </button>
//             </div>
//           )}

//           {/* Other sessions info */}
//           <div className="mt-6 text-center">
//             <p className="text-sm text-gray-600">3 other sessions</p>
//           </div>
//         </div>
//       </div>
//     </DashboardLayout>
//   )
// }
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



export default function Setup2FaPage() {
  const { user, refreshUser } = useAuth();
  const { post, loading } = useApi();
  const router = useRouter();
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("")
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""])
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState<boolean>(false);

  useEffect(() => {
    generateQRCode();
  }, [])

  const generateQRCode = async () => {
    try {
      const response = await post(`/api/auth/2fa/setup`);
      setQrCode(response.qrCode);
      setSecret(response.secret);
    } catch (error) {
      showToast("Failed to generate 2FA setup", "error");
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(secret);
    showToast(`Secret code copied!`, "success");
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    showToast(`Backup codes copied!`, "success");
  }

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  }

  const verifyAndEnable2FA = async () => {
    const code = verificationCode.join('');

    if (code.length !== 6) {
      showToast(`Please enter a valid 6-digit code`, "error");
      return;
    }

    try {
      const response = await post(`/api/auth/2fa/verify`, {
        token: code,
        secret
      })

      setBackupCodes(response.backupCodes)
      setShowBackupCodes(true)
      showToast(`2FA enabled successfully!`, "success")

    } catch (error) {
      showToast(`Invalid verification code`, "error");
      setVerificationCode(["", "", "", "", "", ""]);
      document.getElementById("code-0")?.focus();
    }
  }

  const handleFinish = async () => {
    if (refreshUser) {
      await refreshUser();
    }
    router.push('/settings?tab=security')
  }

  const handleCancel = () => {
    router.push("/settings")
  }

  return (
    <DashboardLayout userRole={user?.role || "MERCHANT_ADMIN"}>
      <div>
        <div onClick={() => { router.back() }} className="text-[#f08c17] px-4 py-2 border border-[#f08c17] rounded-[5px] w-fit hover:cursor-pointer">Back</div>

        <div className="text-[#f08c17] text-2xl font-semibold tracking-wide my-3">2 Factor Authentication</div>
        <div className="w-full bg-white/30 px-5 py-2 rounded-[5px]">
          <div className="w-[500px] max-md:w-full">
            {!showBackupCodes ? (
              <>
                {/* Setup Section */}
                <p className="text-gray-100 text-base">Setup Authenticator App</p>
                <p className="text-white text-[14px]">Each time you log in, in addition to your password, you'll use an authenticator app to generate a one-time code.</p>

                {/* Step 1 */}
                <div className="mt-4">
                  <div className="">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-4 text-[14px] py-1 border-[#f08c17] text-[#f08c17] rounded-full border">Step 1</div>
                      <div className="text-gray-200 font-semibold">Scan QR Code</div>
                    </div>
                    <p className="my-3 text-gray-200">Scan the QR Code below or manually enter the secret key into your authenticator app.</p>
                  </div>
                </div>

                {/* QR Part */}
                <div className="w-full bg-white/10 flex max-md:flex-col rounded-[5px] h-auto p-2 gap-5">
                  {qrCode && (
                    <div className="w-[150px] h-[150px] rounded-[5px] ">
                      <Image className="overflow-hidden rounded-[5px]" src={qrCode} alt="QR Code" width={150} height={150} />
                    </div>
                  )}
                  <div className="grow">
                    <p className="text-white font-semibold tracking-wide">Can't scan QR Code?</p>
                    <p className="text-gray-300 text-[14px] font-normal my-2">Enter this secret instead: </p>
                    <div className="w-full h-[30px] truncate px-3 py-1 rounded-[5px] bg-white/40">{secret.substring(0, 25) + "..."}</div>
                    <button onClick={copyCode} className="my-3 hover:cursor-pointer flex items-center text-[14px] bg-white px-2 py-2 rounded-[5px] gap-1 w-fit shadow-md ">
                      <ClipboardIcon className="h-5 w-5" />
                      <span className="font-semibold">Copy Code</span>
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="mt-4">
                  <div className="">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="px-4 text-[14px] py-1 border-[#f08c17] text-[#f08c17] rounded-full border">Step 2</div>
                      <div className="text-gray-200 font-semibold">Get verification Code</div>
                    </div>
                    <p className="my-3 text-gray-200">Enter the 6-digit code you see in your authenticator app.</p>
                  </div>
                </div>

                {/* Enter verification code */}
                <div className="font-semibold tracking-wide text-gray-200">Enter verification code</div>
                <div className="flex gap-2 my-3">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`code-${index}`}
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
                      className=" border px-4 py-2 rounded-[5px] bg-gray-400 text-black">Cancel</button>
                    <button
                      onClick={verifyAndEnable2FA}
                      disabled={loading || verificationCode.join("").length !== 6}
                      className="bg-[#f08c17] rounded-[5px] px-4 py-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">{loading ? "Verifying..." : "Confirm"}</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Backup Codes Section - Only shown after successful verification */}
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    2FA Enabled Successfully!
                  </h1>
                  <p className="text-gray-200">
                    Save these backup codes in a safe place
                  </p>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-[5px] p-4 mb-6">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-yellow-800 mb-1">Important:</p>
                      <p className="text-sm text-yellow-700">
                        Each backup code can only be used once. Store them securely and don't share them with anyone.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Backup Codes Display */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-white">
                      Your Backup Codes
                    </h2>
                    <button
                      onClick={copyBackupCodes}
                      className="flex items-center gap-1 text-sm text-[#f08c17] hover:text-[#d67a14]"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Copy all
                    </button>
                  </div>
                  <div className="bg-white/10 p-4 rounded-[5px] border border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="bg-white/30 px-3 py-2 rounded border border-gray-200 text-center font-mono text-sm text-white"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full flex justify-end">
                  <button onClick={handleFinish} className="px-5 py-2 rounded-[5px] bg-[#f08c17] text-white w-fit font-semibold">Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

