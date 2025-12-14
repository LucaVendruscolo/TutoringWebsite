'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  PoundSterling,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Plus,
  Banknote,
  Edit2,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculateDerivedBalance } from '@/lib/balance'
import type { Profile, Transaction } from '@/lib/types'
import { subYears } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminPaymentsPage() {
  const [students, setStudents] = useState<Profile[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balancesByStudent, setBalancesByStudent] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  
  // Add/Edit payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [paymentData, setPaymentData] = useState({
    studentId: '',
    amount: '',
    description: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const supabase = createClient()

  const fetchData = async () => {
    const now = new Date()

    // Fetch students
    const { data: studentsData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('student_name')

    if (studentsData) {
      setStudents(studentsData)
    }

    // Fetch transactions for display (also used for credits)
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*, student:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(500)

    if (transactionsData) {
      setTransactions(transactionsData)
    }

    // Fetch all lessons that have ended (used for debits)
    const { data: pastLessons } = await supabase
      .from('lessons')
      .select('student_id, end_time, status, cost')
      .lt('end_time', now.toISOString())
      .neq('status', 'cancelled')

    // Compute derived balances per student
    const creditsByStudent: Record<string, { type: any; amount: any }[]> = {}
    for (const tx of transactionsData || []) {
      if (tx.type !== 'deposit' && tx.type !== 'refund') continue
      const sid = tx.student_id
      if (!creditsByStudent[sid]) creditsByStudent[sid] = []
      creditsByStudent[sid].push({ type: tx.type, amount: tx.amount })
    }

    const lessonsByStudent: Record<string, { status: any; end_time: any; cost: any }[]> = {}
    for (const l of pastLessons || []) {
      const sid = l.student_id
      if (!lessonsByStudent[sid]) lessonsByStudent[sid] = []
      lessonsByStudent[sid].push({ status: l.status, end_time: l.end_time, cost: l.cost })
    }

    const balances: Record<string, number> = {}
    for (const s of studentsData || []) {
      balances[s.id] = calculateDerivedBalance({
        credits: creditsByStudent[s.id] || [],
        lessons: lessonsByStudent[s.id] || [],
        now,
      })
    }
    setBalancesByStudent(balances)

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [supabase])

  const openAddPaymentModal = () => {
    setEditingTransaction(null)
    setPaymentData({ studentId: '', amount: '', description: '' })
    setIsPaymentModalOpen(true)
  }

  const openEditPaymentModal = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setPaymentData({
      studentId: transaction.student_id,
      amount: transaction.amount.toString(),
      description: transaction.description,
    })
    setIsPaymentModalOpen(true)
  }

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentData.studentId || !paymentData.amount) {
      toast.error('Please select a student and enter an amount')
      return
    }

    setIsSubmitting(true)
    try {
      const amount = parseFloat(paymentData.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      const description = paymentData.description.trim() || `External payment of ${formatCurrency(amount)}`

      if (editingTransaction) {
        // Update existing transaction
        const { error } = await supabase
          .from('transactions')
          .update({
            student_id: paymentData.studentId,
            amount,
            description,
          })
          .eq('id', editingTransaction.id)

        if (error) throw error
        toast.success('Payment updated successfully')
      } else {
        // Create new transaction
        const { error } = await supabase.from('transactions').insert({
          student_id: paymentData.studentId,
          type: 'deposit',
          amount,
          description,
        })

        if (error) throw error
        toast.success('Payment recorded successfully')
      }

      setIsPaymentModalOpen(false)
      setPaymentData({ studentId: '', amount: '', description: '' })
      setEditingTransaction(null)
      
      // Refresh data
      setLoading(true)
      await fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePayment = async (transaction: Transaction) => {
    if (!confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      if (error) throw error

      toast.success('Payment deleted successfully')
      
      // Refresh data
      setLoading(true)
      await fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete payment')
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTransactions = selectedStudent
    ? transactions.filter((t) => t.student_id === selectedStudent)
    : transactions

  // Net amount owed (can be positive or negative)
  const netAmountOwed = students.reduce(
    (sum, s) => sum + Number(balancesByStudent[s.id] ?? 0),
    0
  )

  // Calculate deposits from last year
  const now = new Date()
  const oneYearAgo = subYears(now, 1)
  const totalDepositsLastYear = transactions
    .filter((t) => t.type === 'deposit' && new Date(t.created_at) >= oneYearAgo)
    .reduce((sum, t) => sum + t.amount, 0)

  // Helper to check if a transaction can be edited/deleted (no stripe_payment_id)
  const canEditTransaction = (transaction: Transaction) => {
    return !transaction.stripe_payment_id && transaction.type === 'deposit'
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View balances and payment history
            </p>
          </div>
          <Button
            onClick={openAddPaymentModal}
            leftIcon={<Banknote className="w-5 h-5" />}
          >
            Record Payment
          </Button>
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
                          ? 'bg-primary-100 border-primary-200 dark:bg-primary-500/20'
                          : 'hover:bg-gray-50 hover:translate-x-1 dark:hover:bg-gray-900/60'
                      } border border-transparent`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-primary-600">
                            {student.student_name.charAt(0)}
                          </span>
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {student.student_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {student.parent_name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-semibold text-sm ${
                          (balancesByStudent[student.id] ?? 0) < 0
                            ? 'text-coral-600'
                            : (balancesByStudent[student.id] ?? 0) > 0
                            ? 'text-mint-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatCurrency(balancesByStudent[student.id] ?? 0)}
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
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-900/50 dark:border-gray-800"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                              transaction.type === 'deposit'
                                ? 'bg-mint-100 dark:bg-mint-500/10'
                                : transaction.type === 'refund'
                                ? 'bg-accent-100 dark:bg-accent-500/10'
                                : 'bg-coral-100 dark:bg-coral-500/10'
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
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {transaction.description}
                            </p>
                            {transaction.type === 'deposit' && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Paid by{' '}
                                <span className="font-medium text-gray-700 dark:text-gray-200">
                                  {transaction.student?.parent_name?.trim?.() ||
                                    transaction.student?.student_name ||
                                    'Unknown'}
                                </span>
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {formatDate(transaction.created_at, 'MMM d, yyyy h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
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
                              {transaction.stripe_payment_id ? 'stripe' : transaction.type === 'deposit' ? 'external' : transaction.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {/* Edit/Delete buttons for external payments */}
                          {canEditTransaction(transaction) && (
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPaymentModal(transaction)}
                                title="Edit payment"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePayment(transaction)}
                                title="Delete payment"
                                className="text-coral-600 hover:bg-coral-50 dark:hover:bg-coral-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
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

      {/* Add/Edit Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setEditingTransaction(null)
        }}
        title={editingTransaction ? 'Edit External Payment' : 'Record External Payment'}
        size="md"
      >
        <form onSubmit={handleSubmitPayment} className="space-y-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {editingTransaction
              ? 'Update the details of this external payment.'
              : 'Record a cash or bank transfer payment. This will appear as a deposit in the student\'s account.'}
          </p>

          <Select
            label="Student"
            value={paymentData.studentId}
            onChange={(e) =>
              setPaymentData({ ...paymentData, studentId: e.target.value })
            }
            options={[
              { value: '', label: 'Select a student...' },
              ...students.map((s) => ({
                value: s.id,
                label: `${s.student_name} (${s.parent_name})`,
              })),
            ]}
            required
          />

          <Input
            label="Amount (£)"
            type="number"
            min="1"
            step="0.01"
            placeholder="50.00"
            value={paymentData.amount}
            onChange={(e) =>
              setPaymentData({ ...paymentData, amount: e.target.value })
            }
            leftIcon={<PoundSterling className="w-4 h-4" />}
            required
          />

          <Input
            label="Description (optional)"
            placeholder="Cash payment, bank transfer, etc."
            value={paymentData.description}
            onChange={(e) =>
              setPaymentData({ ...paymentData, description: e.target.value })
            }
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setIsPaymentModalOpen(false)
                setEditingTransaction(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={isSubmitting}
              leftIcon={editingTransaction ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {editingTransaction ? 'Update Payment' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
