'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Wallet,
  PoundSterling,
  Plus,
  CheckCircle,
  XCircle,
  CreditCard,
  ArrowLeft,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { calculateDerivedBalance } from '@/lib/balance'
import type { Profile, Transaction } from '@/lib/types'
import toast from 'react-hot-toast'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function StudentBalancePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [derivedBalance, setDerivedBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check for success/cancelled from Stripe redirect
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! Your balance has been updated.')
    } else if (searchParams.get('cancelled') === 'true') {
      toast.error('Payment was cancelled.')
    }

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Fetch recent transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (transactionsData) {
        setRecentTransactions(transactionsData)
      }

      // Fetch credits (deposits + refunds) for balance calculation
      const { data: creditTxs } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('student_id', user.id)
        .in('type', ['deposit', 'refund'])

      // Fetch ended lessons (debits)
      const now = new Date()
      const { data: pastLessons } = await supabase
        .from('lessons')
        .select('status, end_time, cost')
        .eq('student_id', user.id)
        .lt('end_time', now.toISOString())
        .neq('status', 'cancelled')

      const balance = calculateDerivedBalance({
        credits: (creditTxs as any) || [],
        lessons: (pastLessons as any) || [],
        now,
      })
      setDerivedBalance(balance)

      setLoading(false)
    }

    fetchData()

    const interval = setInterval(() => {
      fetchData()
    }, 60_000)

    return () => clearInterval(interval)
  }, [supabase, searchParams])

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount < 5) {
      toast.error('Minimum deposit is £5')
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise
      if (stripe && data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process payment')
      setIsProcessing(false)
    }
  }

  // Calculate lesson-based amounts
  const costPerHour = profile?.cost_per_hour || 0
  const lessonOptions = [
    { lessons: 1, amount: costPerHour },
    { lessons: 2, amount: costPerHour * 2 },
    { lessons: 4, amount: costPerHour * 4 },
  ]

  if (loading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="student">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Balance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your tutoring credit
          </p>
        </div>

        {/* Current Balance */}
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
              title="Current Balance"
              value={formatCurrency(derivedBalance)}
              subtitle={
                derivedBalance < 0
                  ? 'You owe this amount'
                  : 'Available credit'
              }
              icon={<Wallet className="w-6 h-6" />}
              variant={derivedBalance < 0 ? 'warning' : 'success'}
            />
            <StatCard
              title="Cost Per Hour"
              value={formatCurrency(profile?.cost_per_hour || 0)}
              subtitle="Your tutoring rate"
              icon={<PoundSterling className="w-6 h-6" />}
              variant="accent"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
            Balance can be positive or negative.
          </p>
        </div>

        {/* Add Funds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Funds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Quick amounts - based on lessons */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Pay for lessons</p>
                <div className="flex flex-wrap gap-3">
                  {lessonOptions.map((option) => (
                    <motion.button
                      key={option.lessons}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      onClick={() => setDepositAmount(option.amount.toString())}
                      className={`px-6 py-3 rounded-xl font-medium transition-all ${
                        depositAmount === option.amount.toString()
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="block text-sm opacity-75">
                        {option.lessons} {option.lessons === 1 ? 'lesson' : 'lessons'}
                      </span>
                      <span className="block font-bold">
                        {formatCurrency(option.amount)}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Or enter a custom amount</p>
                <div className="flex gap-4 max-w-md">
                  <Input
                    type="number"
                    min="5"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    leftIcon={<PoundSterling className="w-5 h-5" />}
                    placeholder="Enter amount (min £5)"
                  />
                  <Button
                    onClick={handleDeposit}
                    isLoading={isProcessing}
                    leftIcon={<CreditCard className="w-5 h-5" />}
                  >
                    Pay with Card
                  </Button>
                </div>
              </div>

              <Alert variant="info">
                Payments are processed securely through Stripe. Your card details are never stored on the servers.
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction, idx) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 dark:border dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          transaction.type === 'deposit'
                            ? 'bg-mint-100 dark:bg-mint-500/10'
                            : transaction.type === 'refund'
                            ? 'bg-accent-100 dark:bg-accent-500/10'
                            : 'bg-coral-100 dark:bg-coral-500/10'
                        }`}
                      >
                        {transaction.type === 'deposit' ? (
                          <Plus className="w-5 h-5 text-mint-600 dark:text-mint-200" />
                        ) : transaction.type === 'refund' ? (
                          <CheckCircle className="w-5 h-5 text-accent-600 dark:text-accent-200" />
                        ) : (
                          <XCircle className="w-5 h-5 text-coral-600 dark:text-coral-200" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(transaction.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        transaction.type === 'lesson_charge'
                          ? 'text-coral-600'
                          : 'text-mint-600'
                      }`}
                    >
                      {transaction.type === 'lesson_charge' ? '-' : '+'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

