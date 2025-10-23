'use client'

import DashboardLayout from "@/app/components/dashboard-layout";
import { useAuth } from "@/app/lib/auth-context"
import { useApi } from "@/app/lib/use-api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { ArrowLeftIcon, ArrowLongLeftIcon } from "@heroicons/react/24/outline";
import { ArrowLeft } from "lucide-react";

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { useAuth } from '@/app/lib/auth-context'
// import { useApi } from '@/app/lib/use-api'
// import DashboardLayout from '@/app/components/dashboard-layout'
// import {
//   KeyIcon,
//   EyeIcon,
//   EyeSlashIcon,
//   CheckCircleIcon
// } from '@heroicons/react/24/outline'
// import toast from 'react-hot-toast'

// export default function ChangePasswordPage() {
//   const { user } = useAuth()
//   const { post, loading } = useApi()
//   const router = useRouter()
//   const [currentPassword, setCurrentPassword] = useState('')
//   const [newPassword, setNewPassword] = useState('')
//   const [confirmPassword, setConfirmPassword] = useState('')
//   const [showCurrentPassword, setShowCurrentPassword] = useState(false)
//   const [showNewPassword, setShowNewPassword] = useState(false)
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false)

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()

//     if (newPassword !== confirmPassword) {
//       toast.error('New passwords do not match')
//       return
//     }

//     if (newPassword.length < 8) {
//       toast.error('Password must be at least 8 characters long')
//       return
//     }

//     try {
//       await post('/api/auth/change-password', {
//         currentPassword,
//         newPassword
//       })

//       toast.success('Password changed successfully')
//       router.push('/settings')
//     } catch (error) {
//       toast.error('Failed to change password. Please check your current password.')
//     }
//   }

//   const passwordStrength = (password: string) => {
//     let strength = 0
//     if (password.length >= 8) strength++
//     if (/[A-Z]/.test(password)) strength++
//     if (/[a-z]/.test(password)) strength++
//     if (/[0-9]/.test(password)) strength++
//     if (/[^A-Za-z0-9]/.test(password)) strength++
//     return strength
//   }

//   const getStrengthColor = (strength: number) => {
//     switch (strength) {
//       case 0:
//       case 1: return 'bg-red-500'
//       case 2: return 'bg-yellow-500'
//       case 3: return 'bg-blue-500'
//       case 4:
//       case 5: return 'bg-green-500'
//       default: return 'bg-gray-300'
//     }
//   }

//   const getStrengthText = (strength: number) => {
//     switch (strength) {
//       case 0:
//       case 1: return 'Weak'
//       case 2: return 'Fair'
//       case 3: return 'Good'
//       case 4:
//       case 5: return 'Strong'
//       default: return ''
//     }
//   }

//   return (
//     <DashboardLayout userRole={user?.role || 'MERCHANT_ADMIN'}>
//       <div className="max-w-md mx-auto py-8 px-4">
//         <div className="bg-white/30 rounded-lg shadow-sm border border-gray-200 p-8">
//           {/* Header */}
//           <div className="text-center mb-8">
//             <div className="mx-auto h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
//               <KeyIcon className="h-8 w-8 text-amber-600" />
//             </div>
//             <h1 className="text-2xl font-bold text-gray-900">
//               Change Password
//             </h1>
//             <p className="mt-2 text-gray-600">
//               Update your account password
//             </p>
//           </div>

//           {/* Form */}
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* Current Password */}
//             <div>
//               <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
//                 Current Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showCurrentPassword ? 'text' : 'password'}
//                   id="currentPassword"
//                   value={currentPassword}
//                   onChange={(e) => setCurrentPassword(e.target.value)}
//                   required
//                   className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
//                   placeholder="Enter your current password"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowCurrentPassword(!showCurrentPassword)}
//                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                 >
//                   {showCurrentPassword ? (
//                     <EyeSlashIcon className="h-5 w-5 text-gray-400" />
//                   ) : (
//                     <EyeIcon className="h-5 w-5 text-gray-400" />
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* New Password */}
//             <div>
//               <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
//                 New Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showNewPassword ? 'text' : 'password'}
//                   id="newPassword"
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   required
//                   className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
//                   placeholder="Enter your new password"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowNewPassword(!showNewPassword)}
//                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                 >
//                   {showNewPassword ? (
//                     <EyeSlashIcon className="h-5 w-5 text-gray-400" />
//                   ) : (
//                     <EyeIcon className="h-5 w-5 text-gray-400" />
//                   )}
//                 </button>
//               </div>

//               {/* Password Strength Indicator */}
//               {newPassword && (
//                 <div className="mt-2">
//                   <div className="flex items-center space-x-2">
//                     <div className="flex-1 bg-gray-200 rounded-full h-2">
//                       <div
//                         className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength(newPassword))}`}
//                         style={{ width: `${(passwordStrength(newPassword) / 5) * 100}%` }}
//                       ></div>
//                     </div>
//                     <span className="text-sm text-gray-600">
//                       {getStrengthText(passwordStrength(newPassword))}
//                     </span>
//                   </div>
//                 </div>
//               )}
//             </div>

//             {/* Confirm Password */}
//             <div>
//               <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
//                 Confirm New Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showConfirmPassword ? 'text' : 'password'}
//                   id="confirmPassword"
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                   required
//                   className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
//                   placeholder="Confirm your new password"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//                   className="absolute inset-y-0 right-0 pr-3 flex items-center"
//                 >
//                   {showConfirmPassword ? (
//                     <EyeSlashIcon className="h-5 w-5 text-gray-400" />
//                   ) : (
//                     <EyeIcon className="h-5 w-5 text-gray-400" />
//                   )}
//                 </button>
//               </div>

//               {/* Password Match Indicator */}
//               {confirmPassword && (
//                 <div className="mt-2">
//                   {newPassword === confirmPassword ? (
//                     <div className="flex items-center text-green-600 text-sm">
//                       <CheckCircleIcon className="h-4 w-4 mr-1" />
//                       Passwords match
//                     </div>
//                   ) : (
//                     <div className="text-red-600 text-sm">
//                       Passwords do not match
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             {/* Password Requirements */}
//             <div className="bg-gray-50 p-4 rounded-lg">
//               <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
//               <ul className="text-sm text-gray-600 space-y-1">
//                 <li className="flex items-center">
//                   <span className={`w-2 h-2 rounded-full mr-2 ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
//                   At least 8 characters
//                 </li>
//                 <li className="flex items-center">
//                   <span className={`w-2 h-2 rounded-full mr-2 ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
//                   One uppercase letter
//                 </li>
//                 <li className="flex items-center">
//                   <span className={`w-2 h-2 rounded-full mr-2 ${/[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
//                   One lowercase letter
//                 </li>
//                 <li className="flex items-center">
//                   <span className={`w-2 h-2 rounded-full mr-2 ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
//                   One number
//                 </li>
//                 <li className="flex items-center">
//                   <span className={`w-2 h-2 rounded-full mr-2 ${/[^A-Za-z0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
//                   One special character
//                 </li>
//               </ul>
//             </div>

//             {/* Submit Buttons */}
//             <div className="space-y-3">
//               <button
//                 type="submit"
//                 disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
//                 className="w-full bg-amber-700 hover:bg-amber-800 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 {loading ? 'Changing Password...' : 'Change Password'}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => router.push('/settings')}
//                 className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md font-medium"
//               >
//                 Cancel
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </DashboardLayout>
//   )
// }





export default function ChangePasswordPage() {
  const { user } = useAuth();
  const { post, loading } = useApi();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error(`Password must be at least 8 characters long`);
      return;
    }

    try {
      await post(`/api/auth/change-password`, { currentPassword, newPassword });

      toast.success(`Password changed successfully`);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("")
      return;
    } catch (error) {
      toast.error(`Failed to change password. Please check your current password.`)
    }
  }


  //  I'd come back to this functionality, please do not delete
  // const passwordStrength = (password: string) => {
  //   let strength = 0;
  //   if (password.length >= 8) strength++;
  //   if (/[A-Z]/.test(password)) strength++;
  //   if (/[a-z]/.test(password)) strength++;
  //   if (/[0-9]/.test(password)) strength++;
  //   if (/[^A-Za-z0-9]/.test(password)) strength++;
  //   return strength;
  // }

  // const getStrengthColor = (strenght: number) => {
  //   switch (strenght) {
  //     case 0:
  //     case 1: return "bg-red-500";
  //     case 2: return "bg-yellow-500";
  //     case 3: return "bg-blue-500";
  //     case 4:
  //     case 5: return "bg-green-500";
  //     default: return "bg-gray-300";
  //   }
  // }

  const getStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4:
      case 5: return "Strong";
      default: return "";
    }
  }
  return (
    <DashboardLayout userRole={user?.role || "MERCHANT_ADMIN"}>
      <Toaster position="bottom-right" />
      <form onSubmit={handleSubmit}  >

        <div onClick={router.back} className="text-white px-6 py-2 rounded-[5px] my-2 hover:cursor-pointer border border-[#f08c17] w-fit">
          Back
        </div>
        <div className="text-[#F08C17] text-2xl mb-3 font-semibold tracking-wide">Change Password</div>
        <div className="py-6 px-4 rounded-[5px] text-gray-200 bg-white/30">
          <div className="w-[400px] max-md:w-full h-auto">
            {/* Input Holder */}
            <div className="">
              <p className="text-[14px] tracking-wide font-semibold mb-1">Old Password</p>
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                type="password" placeholder="Enter your password" className="w-full outline-none placeholder:text-white border border-[#F08C17] px-4 bg-white/40 h-[45px] rounded-[5px] text-white" />
            </div>
            <div className="mt-4">
              <p className="text-[14px] tracking-wide font-semibold mb-1">New Password</p>
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password" placeholder="Enter New Password" className="w-full outline-none placeholder:text-white border border-[#F08C17] px-4 bg-white/40 h-[45px] rounded-[5px] text-white" />
            </div>
            <p className="text-[13px] my-2">Please add all necessary characters to create a safe password.</p>


            {/* Password Requirements */}
            <div>
              <div className={`flex gap-2 text-[12px] items-center transition-all duration-300 ${newPassword.length >= 8 ? "text-[#f08c17]" : ""}`}> <div className={`w-2 h-2 rounded-full transition-all duration-300 ${newPassword.length >= 8 ? "bg-[#f08c17] " : "bg-gray-300"}`} />Minimum of 8 characters</div>
              <div className={`flex gap-2 text-[12px] items-center transition-all duration-300 ${/[A-Z]/.test(newPassword) ? "text-[#f08c17]" : ""}`}> <div className={`w-2 h-2 rounded-full transition-all duration-300 ${/[A-Z]/.test(newPassword) ? "bg-[#f08c17]" : "bg-gray-300"}`} />One uppercase character</div>
              <div className={`flex gap-2 text-[12px] items-center transition-all duration-300 ${/[a-z]/.test(newPassword) ? "text-[#f08c17]" : ""}`}> <div className={`w-2 h-2 rounded-full transition-all duration-300 ${/[a-z]/.test(newPassword) ? "bg-[#f08c17]" : "bg-gray-300"}`} />One lowercase character</div>
              <div className={`flex gap-2 text-[12px] items-center transition-all duration-300 ${/[!@#$%^&*.]/.test(newPassword) ? "text-[#f08c17]" : ""}`}> <div className={`w-2 h-2 rounded-full transition-all duration-300 ${/[!@#$%^&*.]/.test(newPassword) ? "bg-[#f08c17]" : "bg-gray-300"}`} />One special character</div>
              <div className={`flex gap-2 text-[12px] items-center transition-all duration-300 ${/[0-9]/.test(newPassword) ? "text-[#f08c17]" : ""}`}> <div className={`w-2 h-2 rounded-full transition-all duration-300 ${/[0-9]/.test(newPassword) ? "bg-[#f08c17]" : "bg-gray-300"}`} />One number</div>
            </div>

            {/* Confirm Password Button */}

            <div className="mt-4">
              <p className="text-[14px] tracking-wide font-semibold mb-1">Confirm New Password</p>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password" placeholder="Enter your confirmed new password" className="w-full outline-none placeholder:text-white border border-[#F08C17] px-4 bg-white/40 h-[45px] rounded-[5px] text-white" />
            </div>

            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full rounded-[5px] transition-all duration-300 h-[45px] mt-5 bg-[#f08c17] text-black disabled:opacity-50 disabled:cursor-not-allowed font-semibold tracking-wide">{loading ? "Changing Password..." : "Change Password"}</button>


            <div className="mt-3">
              <Link href={`/forgot-password`} className="w-fit underline hover:text-[#f08c17] transition-colors duration-300 ease-in-out">Forgot Password?</Link>
            </div>

          </div>
        </div>
      </form>
    </DashboardLayout>
  )
}