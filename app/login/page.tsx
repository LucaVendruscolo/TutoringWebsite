'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useTheme } from '@/components/providers/ThemeProvider'
import toast from 'react-hot-toast'

// Animated floating orbs for background
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large gradient orb */}
      <motion.div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/30 to-cyan-300/20 blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Medium accent orb */}
      <motion.div
        className="absolute top-1/4 -right-20 w-72 h-72 rounded-full bg-gradient-to-bl from-indigo-400/25 to-purple-300/15 blur-3xl"
        animate={{
          x: [0, -40, 0],
          y: [0, 50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 1,
        }}
      />
      {/* Small floating orb */}
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-gradient-to-tr from-sky-300/20 to-teal-200/15 blur-2xl"
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />
      {/* Bottom gradient wave */}
      <motion.div
        className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[800px] h-64 rounded-full bg-gradient-to-t from-blue-500/10 to-transparent blur-3xl"
        animate={{
          scaleX: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const router = useRouter()
  const supabaseReady = isSupabaseConfigured()
  const supabase = useMemo(() => createClient(), [])
  const { setTheme } = useTheme()

  // Force light mode on login page
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Get user role + parent name + theme preference
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, parent_name, dark_mode')
        .eq('id', data.user.id)
        .single()

      // Apply user's saved theme preference
      const userTheme = profile?.dark_mode ? 'dark' : 'light'
      setTheme(userTheme)

      const parentName = profile?.parent_name?.trim?.() || ''
      if (parentName) {
        toast.success(`Welcome back, ${parentName}!`)
      }
      
      if (profile?.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <FloatingOrbs />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2.5 mb-8"
            >
              <motion.div 
                className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <GraduationCap className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-lg font-semibold text-gray-900">Luca's Tutoring</span>
            </motion.div>
          </Link>
          <motion.h1 
            className="text-2xl font-semibold text-gray-900 tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {showReset ? 'Reset Password' : 'Sign in'}
          </motion.h1>
          <motion.p 
            className="text-gray-500 mt-2 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {showReset
              ? 'Enter your email to receive a reset link'
              : 'Welcome back. Please enter your details.'}
          </motion.p>
        </div>

        {!supabaseReady && (
          <motion.div 
            className="mb-5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert variant="error" title="Supabase not configured">
              This deployment is missing <code>NEXT_PUBLIC_SUPABASE_URL</code> and/or{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. Add them in Vercel Project Settings →
              Environment Variables, then redeploy.
            </Alert>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <Card padding="lg" className="bg-white/80 backdrop-blur-xl shadow-xl shadow-gray-900/5 border border-white/50">
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
                  disabled={!supabaseReady}
                >
                  Send Reset Link
                </Button>

                <button
                  type="button"
                  onClick={() => setShowReset(false)}
                  className="w-full text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
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
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                  disabled={!supabaseReady}
                >
                  Sign In
                </Button>
              </form>
            )}
          </Card>
        </motion.div>

      </motion.div>
    </div>
  )
}
