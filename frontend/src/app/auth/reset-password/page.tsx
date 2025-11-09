'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import AuthLayout from '@/components/layout/AuthLayout'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    const tokenParam = searchParams?.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      toast.error('Invalid or missing reset token')
      router.push('/auth/forgot-password')
    }
  }, [searchParams, router])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) return
    
    setIsLoading(true)
    
    try {
      await authAPI.resetPassword({ 
        token, 
        newPassword: data.password 
      })
      
      setIsSuccess(true)
      toast.success('Password reset successfully!')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.formattedMessage || 'Failed to reset password. Please try again.'
      toast.error(errorMessage)
      
      // If token is invalid or expired, redirect to forgot password page
      if (error.response?.status === 400 || error.response?.status === 401) {
        setTimeout(() => {
          router.push('/auth/forgot-password')
        }, 2000)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout>
        <div className="space-y-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-2xl sm:p-8">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg mb-6">
                <CheckCircleIcon className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Password Reset Successfully!
              </h2>
              
              <p className="text-gray-600 mb-6">
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              
              <Link
                href="/auth/login"
                className="flex w-full items-center justify-center rounded-xl border border-transparent px-4 py-3 text-sm font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
    </AuthLayout>
    )
  }

  if (!token) {
    return (
      <AuthLayout>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-2xl sm:p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-2xl sm:p-8">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
              <LockClosedIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Reset Your Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-gray-600 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/auth/login"
                className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-white/20 p-6 shadow-2xl sm:p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </div>
      </AuthLayout>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
