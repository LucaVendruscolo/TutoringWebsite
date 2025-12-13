'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  PoundSterling,
  TrendingDown,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Profile, Transaction } from '@/lib/types'
import { subYears } from 'date-fns'

export default function AdminPaymentsPage() {
  const [students, setStudents] = useState<Profile[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date()
      const oneYearAgo = subYears(now, 1)

      // Fetch students
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('student_name')

      if (studentsData) {
        setStudents(studentsData)
      }

      // Fetch transactions (all time for display, but filter for stats)
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*, student:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (transactionsData) {
        setTransactions(transactionsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const filteredStudents = students.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTransactions = selectedStudent
    ? transactions.filter((t) => t.student_id === selectedStudent)
    : transactions

  // Net amount owed (can be positive or negative)
  const netAmountOwed = students.reduce((sum, s) => sum + Number(s.balance), 0)

  // Calculate deposits from last year
  const now = new Date()
  const oneYearAgo = subYears(now, 1)
  const totalDepositsLastYear = transactions
    .filter((t) => t.type === 'deposit' && new Date(t.created_at) >= oneYearAgo)
    .reduce((sum, t) => sum + t.amount, 0)

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1">
            View balances and payment history
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Net Parent Balances"
            value={formatCurrency(netAmountOwed)}
            subtitle={netAmountOwed < 0 ? 'Parents owe you' : netAmountOwed > 0 ? 'Credit balance' : 'Balanced'}
            icon={<TrendingUp className="w-6 h-6" />}
            variant={netAmountOwed < 0 ? 'warning' : 'success'}
          />
          <StatCard
            title="Total Deposits (Last Year)"
            value={formatCurrency(totalDepositsLastYear)}
            icon={<PoundSterling className="w-6 h-6" />}
            variant="accent"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Student Balances */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Student Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() =>
                        setSelectedStudent(
                          selectedStudent === student.id ? null : student.id
                        )
                      }
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                        selectedStudent === student.id
                          ? 'bg-primary-100 border-primary-200'
                          : 'hover:bg-gray-50 hover:translate-x-1'
                      } border border-transparent`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-600">
                            {student.student_name.charAt(0)}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 text-sm">
                            {student.student_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {student.parent_name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold text-sm ${
                          student.balance < 0
                            ? 'text-coral-600'
                            : student.balance > 0
                            ? 'text-mint-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatCurrency(student.balance)}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>
                  {selectedStudent
                    ? `${students.find((s) => s.id === selectedStudent)?.student_name}'s Transactions`
                    : 'Recent Transactions'}
                </CardTitle>
                {selectedStudent && (
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View all
                  </button>
                )}
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
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
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              transaction.type === 'deposit'
                                ? 'bg-mint-100'
                                : transaction.type === 'refund'
                                ? 'bg-accent-100'
                                : 'bg-coral-100'
                            }`}
                          >
                            {transaction.type === 'deposit' ? (
                              <ArrowDownRight className="w-5 h-5 text-mint-600" />
                            ) : transaction.type === 'refund' ? (
                              <ArrowUpRight className="w-5 h-5 text-accent-600" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-coral-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {transaction.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
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
        </div>
      </div>
    </DashboardLayout>
  )
}

