'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Get user role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // Debug logging - check browser console
      console.log('User ID:', data.user.id)
      console.log('Profile data:', profile)
      console.log('Profile error:', profileError)
      console.log('Role:', profile?.role)

      toast.success('Welcome back!')
      
      if (profile?.role === 'admin') {
        console.log('Redirecting to admin dashboard')
        router.push('/admin/dashboard')
      } else {
        console.log('Redirecting to student dashboard')
        router.push('/student/dashboard')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      toast.success('Password reset link sent to your email!')
      setShowReset(false)
      setResetEmail('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#fbfbfd]">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-primary-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="inline-flex items-center gap-2.5 mb-8"
            >
              <div className="p-2 rounded-xl bg-primary-500">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Luca's Tutoring</span>
            </motion.div>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {showReset ? 'Reset Password' : 'Sign in'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {showReset
              ? 'Enter your email to receive a reset link'
              : 'Welcome back. Please enter your details.'}
          </p>
        </div>

        <Card padding="lg" className="bg-white">
          {showReset ? (
            // Reset password form
            <form onSubmit={handleResetPassword} className="space-y-5">
              <Input
                type="email"
                label="Email"
                placeholder="your@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Send Reset Link
              </Button>

              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="w-full text-center text-sm text-gray-500 hover:text-primary-500 transition-colors"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            // Login form
            <form onSubmit={handleLogin} className="space-y-5">
              <Input
                type="email"
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                }
                required
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Sign In
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
