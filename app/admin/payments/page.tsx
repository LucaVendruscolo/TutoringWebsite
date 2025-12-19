'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  PoundSterling,
  TrendingUp,
  ArrowDownRight,
  ArrowLeft,
  Plus,
  Banknote,
  Edit2,
  Trash2,
  FileText,
  Printer,
  Download,
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
import { subYears, format, addDays } from 'date-fns'
import toast from 'react-hot-toast'

// Bank details for invoice
const BANK_DETAILS = {
  accountName: 'Luca Vendruscolo',
  bank: 'Santander',
  sortCode: '09-01-29',
  accountNumber: '23843468',
}

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
  
  // Invoice modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [invoiceStudent, setInvoiceStudent] = useState<Profile | null>(null)
  const [invoiceData, setInvoiceData] = useState({
    amount: '',
    description: 'Tutoring Services',
    dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    invoiceNumber: '',
  })
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)
  
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

    // Fetch transactions for display - only deposits (no refunds)
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*, student:profiles(*)')
      .in('type', ['deposit', 'lesson_charge'])
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
      if (tx.type !== 'deposit') continue
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

  const openInvoiceModal = (student: Profile) => {
    const balance = balancesByStudent[student.id] ?? 0
    const amountOwed = balance < 0 ? Math.abs(balance) : 0
    
    setInvoiceStudent(student)
    setInvoiceData({
      amount: amountOwed > 0 ? amountOwed.toFixed(2) : '',
      description: 'Tutoring Services',
      dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      invoiceNumber: `INV-${format(new Date(), 'yyyyMMdd')}-${student.student_name.substring(0, 3).toUpperCase()}`,
    })
    setShowInvoicePreview(false)
    setIsInvoiceModalOpen(true)
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

      const description = paymentData.description.trim() || `External payment`

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
      // First verify this is a deletable transaction
      if (transaction.stripe_payment_id) {
        toast.error('Cannot delete Stripe payments. Please refund through Stripe dashboard.')
        return
      }
      
      if (transaction.type !== 'deposit') {
        toast.error('Can only delete external deposit payments')
        return
      }

      const { error, count } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)
        .select()

      if (error) {
        console.error('Delete error:', error)
        throw error
      }

      toast.success('Payment deleted successfully')
      
      // Refresh data
      setLoading(true)
      await fetchData()
    } catch (error: any) {
      console.error('Delete payment failed:', error)
      toast.error(error.message || 'Failed to delete payment. Check console for details.')
    }
  }

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !invoiceRef.current) return

    const invoiceHtml = invoiceRef.current.innerHTML
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoiceData.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1d1d1f;
              line-height: 1.5;
            }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0071e3; }
            .invoice-title { font-size: 32px; font-weight: 700; color: #0071e3; }
            .invoice-number { font-size: 14px; color: #636366; margin-top: 4px; }
            .invoice-date { text-align: right; }
            .invoice-date p { font-size: 14px; color: #636366; }
            .invoice-date strong { color: #1d1d1f; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .party { flex: 1; }
            .party-title { font-size: 12px; font-weight: 600; color: #636366; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .party-name { font-size: 18px; font-weight: 600; color: #1d1d1f; margin-bottom: 4px; }
            .party-detail { font-size: 14px; color: #636366; }
            .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .invoice-table th { text-align: left; padding: 12px 16px; background: #f5f5f7; font-size: 12px; font-weight: 600; color: #636366; text-transform: uppercase; letter-spacing: 0.5px; }
            .invoice-table td { padding: 16px; border-bottom: 1px solid #e8e8ed; font-size: 14px; }
            .invoice-table .amount { text-align: right; font-weight: 600; }
            .invoice-total { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .total-box { background: #f5f5f7; padding: 20px 30px; border-radius: 12px; min-width: 250px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .total-row.grand { font-size: 20px; font-weight: 700; color: #0071e3; border-top: 2px solid #d2d2d7; padding-top: 12px; margin-top: 8px; }
            .bank-details { background: #f0f9ff; border: 1px solid #0071e3; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
            .bank-title { font-size: 14px; font-weight: 600; color: #0071e3; margin-bottom: 16px; }
            .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .bank-item { }
            .bank-label { font-size: 12px; color: #636366; }
            .bank-value { font-size: 14px; font-weight: 600; color: #1d1d1f; }
            .invoice-footer { text-align: center; padding-top: 20px; border-top: 1px solid #e8e8ed; }
            .footer-text { font-size: 12px; color: #636366; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${invoiceHtml}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    
    setTimeout(() => {
      printWindow.print()
    }, 250)
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
      <div className="space-y-6">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Payments</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
              View balances and payment history
            </p>
          </div>
          <Button
            onClick={openAddPaymentModal}
            leftIcon={<Banknote className="w-5 h-5" />}
            className="w-full sm:w-auto"
          >
            Record Payment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
                        selectedStudent === student.id
                          ? 'bg-primary-100 dark:bg-primary-500/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900/60'
                      }`}
                    >
                      <button
                        onClick={() =>
                          setSelectedStudent(
                            selectedStudent === student.id ? null : student.id
                          )
                        }
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-600">
                            {student.student_name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                            {student.student_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {student.parent_name}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-sm flex-shrink-0 ${
                            (balancesByStudent[student.id] ?? 0) < 0
                              ? 'text-coral-600'
                              : (balancesByStudent[student.id] ?? 0) > 0
                              ? 'text-mint-600'
                              : 'text-gray-500'
                          }`}
                        >
                          {formatCurrency(balancesByStudent[student.id] ?? 0)}
                        </span>
                        {/* Invoice button - only show on desktop */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openInvoiceModal(student)
                          }}
                          className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                          title="Create Invoice"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base sm:text-lg">
                  {selectedStudent
                    ? `${students.find((s) => s.id === selectedStudent)?.student_name}'s Transactions`
                    : 'Recent Transactions'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {selectedStudent && (
                    <>
                      <button
                        onClick={() => {
                          const student = students.find((s) => s.id === selectedStudent)
                          if (student) openInvoiceModal(student)
                        }}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        Invoice
                      </button>
                      <span className="text-gray-300 dark:text-gray-700">|</span>
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        View all
                      </button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No transactions found
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredTransactions.map((transaction, idx) => {
                      const isEditable = canEditTransaction(transaction)
                      
                      return (
                        <motion.div
                          key={transaction.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="p-3 sm:p-4 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-900/50 dark:border-gray-800"
                        >
                          {/* Mobile-first layout */}
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                                transaction.type === 'deposit'
                                  ? 'bg-mint-100 dark:bg-mint-500/10'
                                  : 'bg-coral-100 dark:bg-coral-500/10'
                              }`}
                            >
                              <ArrowDownRight className={`w-5 h-5 ${
                                transaction.type === 'deposit' ? 'text-mint-600' : 'text-coral-600'
                              }`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {transaction.description}
                                  </p>
                                  {transaction.type === 'deposit' && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      Paid by {transaction.student?.parent_name?.trim?.() || transaction.student?.student_name || 'Unknown'}
                                    </p>
                                  )}
                                </div>
                                <p
                                  className={`font-semibold text-sm flex-shrink-0 ${
                                    transaction.type === 'deposit' ? 'text-mint-600' : 'text-coral-600'
                                  }`}
                                >
                                  {transaction.type === 'deposit' ? '+' : '-'}
                                  {formatCurrency(Math.abs(transaction.amount))}
                                </p>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {formatDate(transaction.created_at, 'MMM d, yyyy')}
                                  </span>
                                  <Badge
                                    variant={transaction.type === 'deposit' ? 'success' : 'danger'}
                                    size="sm"
                                  >
                                    {transaction.stripe_payment_id ? 'stripe' : transaction.type === 'deposit' ? 'external' : 'charge'}
                                  </Badge>
                                </div>
                                
                                {isEditable && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEditPaymentModal(transaction)}
                                      className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                      title="Edit payment"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayment(transaction)}
                                      className="p-1.5 rounded-lg text-gray-500 hover:text-coral-600 hover:bg-coral-50 dark:hover:bg-coral-500/10 transition-colors"
                                      title="Delete payment"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
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
              : 'Record a cash or bank transfer payment.'}
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
            placeholder="e.g. Cash, Bank transfer"
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
              {editingTransaction ? 'Update' : 'Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Modal */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false)
          setShowInvoicePreview(false)
          setInvoiceStudent(null)
        }}
        title={showInvoicePreview ? 'Invoice Preview' : 'Create Invoice'}
        size="xl"
      >
        {!showInvoicePreview ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create an invoice for {invoiceStudent?.parent_name || invoiceStudent?.student_name}
            </p>

            <Input
              label="Invoice Number"
              value={invoiceData.invoiceNumber}
              onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
              placeholder="INV-001"
            />

            <Input
              label="Amount (£)"
              type="number"
              min="0"
              step="0.01"
              value={invoiceData.amount}
              onChange={(e) => setInvoiceData({ ...invoiceData, amount: e.target.value })}
              leftIcon={<PoundSterling className="w-4 h-4" />}
              required
            />

            <Input
              label="Description"
              value={invoiceData.description}
              onChange={(e) => setInvoiceData({ ...invoiceData, description: e.target.value })}
              placeholder="Tutoring Services"
            />

            <Input
              label="Due Date"
              type="date"
              value={invoiceData.dueDate}
              onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setIsInvoiceModalOpen(false)
                  setInvoiceStudent(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => setShowInvoicePreview(true)}
                leftIcon={<FileText className="w-4 h-4" />}
                disabled={!invoiceData.amount || parseFloat(invoiceData.amount) <= 0}
              >
                Preview Invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Invoice Preview */}
            <div 
              ref={invoiceRef}
              className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200"
              style={{ colorScheme: 'light' }}
            >
              <div className="invoice-container">
                {/* Header */}
                <div className="invoice-header flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pb-4 border-b-2 border-primary-500">
                  <div>
                    <h1 className="invoice-title text-2xl sm:text-3xl font-bold text-primary-500">INVOICE</h1>
                    <p className="invoice-number text-sm text-gray-500 mt-1">{invoiceData.invoiceNumber}</p>
                  </div>
                  <div className="invoice-date text-left sm:text-right">
                    <p className="text-sm text-gray-500">
                      <strong className="text-gray-900">Date:</strong> {format(new Date(), 'dd MMMM yyyy')}
                    </p>
                    <p className="text-sm text-gray-500">
                      <strong className="text-gray-900">Due:</strong> {format(new Date(invoiceData.dueDate), 'dd MMMM yyyy')}
                    </p>
                  </div>
                </div>

                {/* Parties */}
                <div className="parties flex flex-col sm:flex-row justify-between gap-6 mb-8">
                  <div className="party">
                    <p className="party-title text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From</p>
                    <p className="party-name text-lg font-semibold text-gray-900">Luca Vendruscolo</p>
                    <p className="party-detail text-sm text-gray-500">Tutoring Services</p>
                  </div>
                  <div className="party">
                    <p className="party-title text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To</p>
                    <p className="party-name text-lg font-semibold text-gray-900">{invoiceStudent?.parent_name || invoiceStudent?.student_name}</p>
                    <p className="party-detail text-sm text-gray-500">Student: {invoiceStudent?.student_name}</p>
                    <p className="party-detail text-sm text-gray-500">{invoiceStudent?.email}</p>
                  </div>
                </div>

                {/* Table */}
                <table className="invoice-table w-full mb-6">
                  <thead>
                    <tr>
                      <th className="text-left p-3 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="text-right p-3 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-4 border-b border-gray-200 text-sm text-gray-900">{invoiceData.description}</td>
                      <td className="p-4 border-b border-gray-200 text-sm text-gray-900 text-right font-semibold">
                        {formatCurrency(parseFloat(invoiceData.amount) || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Total */}
                <div className="invoice-total flex justify-end mb-8">
                  <div className="total-box bg-gray-100 p-5 rounded-xl min-w-[200px] sm:min-w-[250px]">
                    <div className="total-row flex justify-between mb-2">
                      <span className="text-sm text-gray-500">Subtotal</span>
                      <span className="text-sm text-gray-900">{formatCurrency(parseFloat(invoiceData.amount) || 0)}</span>
                    </div>
                    <div className="total-row grand flex justify-between text-lg font-bold text-primary-500 border-t-2 border-gray-300 pt-3 mt-2">
                      <span>Total Due</span>
                      <span>{formatCurrency(parseFloat(invoiceData.amount) || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="bank-details bg-blue-50 border border-primary-500 rounded-xl p-5 mb-6">
                  <p className="bank-title text-sm font-semibold text-primary-500 mb-4">Payment Details</p>
                  <div className="bank-grid grid grid-cols-2 gap-3">
                    <div className="bank-item">
                      <p className="bank-label text-xs text-gray-500">Account Name</p>
                      <p className="bank-value text-sm font-semibold text-gray-900">{BANK_DETAILS.accountName}</p>
                    </div>
                    <div className="bank-item">
                      <p className="bank-label text-xs text-gray-500">Bank</p>
                      <p className="bank-value text-sm font-semibold text-gray-900">{BANK_DETAILS.bank}</p>
                    </div>
                    <div className="bank-item">
                      <p className="bank-label text-xs text-gray-500">Sort Code</p>
                      <p className="bank-value text-sm font-semibold text-gray-900">{BANK_DETAILS.sortCode}</p>
                    </div>
                    <div className="bank-item">
                      <p className="bank-label text-xs text-gray-500">Account Number</p>
                      <p className="bank-value text-sm font-semibold text-gray-900">{BANK_DETAILS.accountNumber}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="invoice-footer text-center pt-4 border-t border-gray-200">
                  <p className="footer-text text-xs text-gray-500">
                    Thank you for your business. Please include the invoice number as the payment reference.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setShowInvoicePreview(false)}
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handlePrintInvoice}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}
