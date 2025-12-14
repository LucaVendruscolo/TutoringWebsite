'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeft,
  Calendar,
  Filter,
  Download,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import Link from 'next/link'

export default function StudentHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'deposit' | 'lesson_charge' | 'refund'>('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('student_id', user.id)
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payment History</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View all your transactions
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'deposit', 'lesson_charge', 'refund'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'lesson_charge' ? 'Charges' : f.charAt(0).toUpperCase() + f.slice(1)}
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
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-900/50 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          transaction.type === 'deposit'
                            ? 'bg-mint-100 dark:bg-mint-500/10'
                            : transaction.type === 'refund'
                            ? 'bg-accent-100 dark:bg-accent-500/10'
                            : 'bg-coral-100 dark:bg-coral-500/10'
                        }`}
                      >
                        {transaction.type === 'deposit' ||
                        transaction.type === 'refund' ? (
                          <ArrowDownRight
                            className={`w-5 h-5 ${
                              transaction.type === 'deposit'
                                ? 'text-mint-600'
                                : 'text-accent-600'
                            }`}
                          />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-coral-600 dark:text-coral-200" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(transaction.created_at, 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === 'lesson_charge'
                            ? 'text-coral-600'
                            : 'text-mint-600'
                        }`}
                      >
                        {transaction.type === 'lesson_charge' ? '-' : '+'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </p>
                      <Badge
                        variant={
                          transaction.type === 'deposit'
                            ? 'success'
                            : transaction.type === 'refund'
                            ? 'accent'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {transaction.type.replace('_', ' ')}
                      </Badge>
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

