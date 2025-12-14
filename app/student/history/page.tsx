'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeft,
  Calendar,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import Link from 'next/link'

export default function StudentHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'deposit' | 'lesson_charge'>('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', user.id)
        .in('type', ['deposit', 'lesson_charge'])
        .order('created_at', { ascending: false })

      if (transactionsData) {
        setTransactions(transactionsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true
    return t.type === filter
  })

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/student/dashboard"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Payment History</h1>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
              View all your transactions
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'deposit', 'lesson_charge'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'lesson_charge' ? 'Charges' : f === 'deposit' ? 'Deposits' : 'All'}
            </Button>
          ))}
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                No transactions found
              </p>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction, idx) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-900/50 dark:border-gray-800"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                          transaction.type === 'deposit'
                            ? 'bg-mint-100 dark:bg-mint-500/10'
                            : 'bg-coral-100 dark:bg-coral-500/10'
                        }`}
                      >
                        {transaction.type === 'deposit' ? (
                          <ArrowDownRight className="w-5 h-5 text-mint-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-coral-600 dark:text-coral-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100">
                              {transaction.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              {formatDate(transaction.created_at, 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                          <p
                            className={`font-semibold text-sm flex-shrink-0 ${
                              transaction.type === 'lesson_charge'
                                ? 'text-coral-600'
                                : 'text-mint-600'
                            }`}
                          >
                            {transaction.type === 'lesson_charge' ? '-' : '+'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </p>
                        </div>
                        <div className="mt-2">
                          <Badge
                            variant={
                              transaction.type === 'deposit'
                                ? 'success'
                                : 'danger'
                            }
                            size="sm"
                          >
                            {transaction.type === 'deposit' ? 'deposit' : 'charge'}
                          </Badge>
                        </div>
                      </div>
                    </div>
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
