'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeft,
  Calendar,
  FileText,
  Printer,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Profile, Transaction } from '@/lib/types'
import Link from 'next/link'
import { format } from 'date-fns'

// Bank details for receipt
const BANK_DETAILS = {
  accountName: 'Luca Vendruscolo',
  bank: 'Santander',
  sortCode: '09-01-29',
  accountNumber: '23843468',
}

export default function StudentHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'deposit' | 'lesson_charge'>('all')
  
  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  useEffect(() => {
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

  const openReceiptModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsReceiptModalOpen(true)
  }

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !receiptRef.current || !selectedTransaction) return

    const receiptHtml = receiptRef.current.innerHTML
    const receiptNumber = `REC-${format(new Date(selectedTransaction.created_at), 'yyyyMMdd')}-${selectedTransaction.id.substring(0, 4).toUpperCase()}`
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1d1d1f;
              line-height: 1.5;
            }
            .receipt-container { max-width: 600px; margin: 0 auto; }
            .receipt-header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #34c759; }
            .receipt-title { font-size: 28px; font-weight: 700; color: #34c759; }
            .receipt-number { font-size: 14px; color: #636366; margin-top: 4px; }
            .receipt-status { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 12px; }
            .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .party { flex: 1; }
            .party-title { font-size: 12px; font-weight: 600; color: #636366; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .party-name { font-size: 16px; font-weight: 600; color: #1d1d1f; margin-bottom: 4px; }
            .party-detail { font-size: 14px; color: #636366; }
            .details-box { background: #f5f5f7; border-radius: 12px; padding: 24px; margin-bottom: 30px; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e8e8ed; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-size: 14px; color: #636366; }
            .detail-value { font-size: 14px; font-weight: 600; color: #1d1d1f; }
            .total-box { background: #f0fdf4; border: 2px solid #34c759; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; }
            .total-label { font-size: 12px; color: #636366; text-transform: uppercase; letter-spacing: 0.5px; }
            .total-amount { font-size: 32px; font-weight: 700; color: #34c759; margin-top: 4px; }
            .bank-details { background: #f0f9ff; border: 1px solid #0071e3; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
            .bank-title { font-size: 14px; font-weight: 600; color: #0071e3; margin-bottom: 12px; }
            .bank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .bank-item { }
            .bank-label { font-size: 12px; color: #636366; }
            .bank-value { font-size: 14px; font-weight: 600; color: #1d1d1f; }
            .receipt-footer { text-align: center; padding-top: 20px; border-top: 1px solid #e8e8ed; }
            .footer-text { font-size: 12px; color: #636366; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${receiptHtml}
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

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
                        <div className="flex items-center justify-between mt-2">
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
                          
                          {/* Receipt button for deposits */}
                          {transaction.type === 'deposit' && (
                            <button
                              onClick={() => openReceiptModal(transaction)}
                              className="hidden sm:flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Receipt
                            </button>
                          )}
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

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false)
          setSelectedTransaction(null)
        }}
        title="Payment Receipt"
        size="lg"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            {/* Receipt Preview */}
            <div 
              ref={receiptRef}
              className="bg-white rounded-xl p-6 border border-gray-200"
              style={{ colorScheme: 'light' }}
            >
              <div className="receipt-container">
                {/* Header */}
                <div className="receipt-header text-center mb-8 pb-4 border-b-2 border-mint-500">
                  <h1 className="receipt-title text-2xl font-bold text-mint-500">PAYMENT RECEIPT</h1>
                  <p className="receipt-number text-sm text-gray-500 mt-1">
                    REC-{format(new Date(selectedTransaction.created_at), 'yyyyMMdd')}-{selectedTransaction.id.substring(0, 4).toUpperCase()}
                  </p>
                  <span className="receipt-status inline-block bg-mint-100 text-mint-700 px-3 py-1 rounded-full text-xs font-semibold mt-3">
                    PAID
                  </span>
                </div>

                {/* Parties */}
                <div className="parties flex flex-col sm:flex-row justify-between gap-6 mb-8">
                  <div className="party">
                    <p className="party-title text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Received From</p>
                    <p className="party-name text-base font-semibold text-gray-900">{profile?.parent_name || profile?.student_name}</p>
                    <p className="party-detail text-sm text-gray-500">Student: {profile?.student_name}</p>
                    <p className="party-detail text-sm text-gray-500">{profile?.email}</p>
                  </div>
                  <div className="party">
                    <p className="party-title text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Received By</p>
                    <p className="party-name text-base font-semibold text-gray-900">Luca Vendruscolo</p>
                    <p className="party-detail text-sm text-gray-500">Tutoring Services</p>
                  </div>
                </div>

                {/* Details */}
                <div className="details-box bg-gray-100 rounded-xl p-5 mb-6">
                  <div className="detail-row flex justify-between py-3 border-b border-gray-200">
                    <span className="detail-label text-sm text-gray-500">Description</span>
                    <span className="detail-value text-sm font-semibold text-gray-900">{selectedTransaction.description}</span>
                  </div>
                  <div className="detail-row flex justify-between py-3 border-b border-gray-200">
                    <span className="detail-label text-sm text-gray-500">Date</span>
                    <span className="detail-value text-sm font-semibold text-gray-900">
                      {format(new Date(selectedTransaction.created_at), 'dd MMMM yyyy')}
                    </span>
                  </div>
                  <div className="detail-row flex justify-between py-3 border-b border-gray-200">
                    <span className="detail-label text-sm text-gray-500">Time</span>
                    <span className="detail-value text-sm font-semibold text-gray-900">
                      {format(new Date(selectedTransaction.created_at), 'HH:mm')}
                    </span>
                  </div>
                  <div className="detail-row flex justify-between py-3">
                    <span className="detail-label text-sm text-gray-500">Payment Method</span>
                    <span className="detail-value text-sm font-semibold text-gray-900">
                      {selectedTransaction.stripe_payment_id ? 'Card (Stripe)' : 'Bank Transfer / Cash'}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="total-box bg-mint-50 border-2 border-mint-500 rounded-xl p-5 text-center mb-6">
                  <p className="total-label text-xs text-gray-500 uppercase tracking-wider">Amount Paid</p>
                  <p className="total-amount text-3xl font-bold text-mint-500 mt-1">
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>

                {/* Bank Details */}
                <div className="bank-details bg-blue-50 border border-primary-500 rounded-xl p-5 mb-6">
                  <p className="bank-title text-sm font-semibold text-primary-500 mb-3">Payment Received To</p>
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
                <div className="receipt-footer text-center pt-4 border-t border-gray-200">
                  <p className="footer-text text-xs text-gray-500">
                    Thank you for your payment. This receipt serves as confirmation of your transaction.
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
                onClick={() => {
                  setIsReceiptModalOpen(false)
                  setSelectedTransaction(null)
                }}
              >
                Close
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handlePrintReceipt}
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
