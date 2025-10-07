'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { EnvelopeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import AuthLayout from '@/components/layout/AuthLayout'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    
    try {
      await authAPI.forgotPassword(data.email)
      setIsSubmitted(true)
      toast.success('Password reset email sent successfully!')
    } catch (error: any) {
      // Handle 404 (user not found) gracefully - still show success to prevent email enumeration
      if (error.response?.status === 404) {
        setIsSubmitted(true)
        toast.success('If an account with that email exists, password reset instructions have been sent.')
      } else {
        const errorMessage = error.response?.data?.message || error.formattedMessage || 'Failed to send reset email. Please try again.'
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <AuthLayout>
        <div className="space-y-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg mb-6">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Check Your Email
              </h2>
              
              <p className="text-gray-600 mb-6">
                If an account with that email exists, we've sent password reset instructions to your email address. Please check your inbox and follow the instructions to reset your password.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-700">
                  <strong>Note:</strong> The reset link will expire in 1 hour for security reasons.
                </p>
              </div>
              
              <div className="space-y-4">
                <Link
                  href="/auth/login"
                  className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Back to Sign In
                </Link>
                
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                >
                  Try Another Email
                </button>
              </div>
            </div>
          </div>
        </div>
    </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
              <EnvelopeIcon className="h-8 w-8 text-white" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
              Forgot Password?
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              No worries! Enter your email address and we'll send you a reset link.
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-gray-50 focus:bg-white"
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email.message}
                </p>
              )}
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
                    Sending Reset Link...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>

            <div className="text-center pt-4">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AuthLayout>
  )
}
