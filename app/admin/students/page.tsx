'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Mail,
  User,
  PoundSterling,
  Edit2,
  Trash2,
  Copy,
  Check,
  Eye,
  ArrowLeft,
  UserMinus,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Select } from '@/components/ui/Select'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, generateTempPassword, TIMEZONES } from '@/lib/utils'
import { calculateDerivedBalance } from '@/lib/balance'
import type { Profile } from '@/lib/types'
import toast from 'react-hot-toast'

export default function StudentsPage() {
  const [students, setStudents] = useState<Profile[]>([])
  const [balancesByStudent, setBalancesByStudent] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null)
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    parentName: '',
    studentName: '',
    costPerHour: '',
    timezone: 'Europe/London',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false })

    if (data) {
      setStudents(data)
    }

    // Derived balances
    const now = new Date()
    const { data: creditTxs } = await supabase
      .from('transactions')
      .select('student_id, type, amount')
      .eq('type', 'deposit')
      .limit(5000)

    const { data: endedLessons } = await supabase
      .from('lessons')
      .select('student_id, end_time, status, cost')
      .lt('end_time', now.toISOString())
      .neq('status', 'cancelled')

    const creditsByStudent: Record<string, { type: any; amount: any }[]> = {}
    for (const tx of creditTxs || []) {
      const sid = tx.student_id
      if (!creditsByStudent[sid]) creditsByStudent[sid] = []
      creditsByStudent[sid].push({ type: tx.type, amount: tx.amount })
    }
    const lessonsByStudent: Record<string, { status: any; end_time: any; cost: any }[]> = {}
    for (const l of endedLessons || []) {
      const sid = l.student_id
      if (!lessonsByStudent[sid]) lessonsByStudent[sid] = []
      lessonsByStudent[sid].push({ status: l.status, end_time: l.end_time, cost: l.cost })
    }

    const balances: Record<string, number> = {}
    for (const s of data || []) {
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
    fetchStudents()
  }, [])

  const filteredStudents = students.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeStudents = filteredStudents.filter((s) => s.is_active !== false)
  const inactiveStudents = filteredStudents.filter((s) => s.is_active === false)

  const handleToggleActive = async (student: Profile) => {
    const newStatus = !student.is_active
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', student.id)

    if (error) {
      toast.error('Failed to update student status')
      return
    }

    toast.success(newStatus ? 'Student reactivated' : 'Student set to inactive')
    fetchStudents()
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const tempPassword = generateTempPassword()

      // Create user via API route (needs admin privileges)
      const response = await fetch('/api/admin/create-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: tempPassword,
          parentName: formData.parentName,
          studentName: formData.studentName,
          costPerHour: parseFloat(formData.costPerHour),
          timezone: formData.timezone,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create student')
      }

      setNewCredentials({
        email: formData.email,
        password: tempPassword,
      })

      setIsAddModalOpen(false)
      setIsCredentialsModalOpen(true)
      setFormData({
        email: '',
        parentName: '',
        studentName: '',
        costPerHour: '',
        timezone: 'Europe/London',
      })
      fetchStudents()
      toast.success('Student created successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          parent_name: formData.parentName,
          student_name: formData.studentName,
          cost_per_hour: parseFloat(formData.costPerHour),
          timezone: formData.timezone,
        })
        .eq('id', selectedStudent.id)

      if (error) throw error

      setIsEditModalOpen(false)
      fetchStudents()
      toast.success('Student updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update student')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStudent = async (student: Profile) => {
    if (!confirm(`Are you sure you want to delete ${student.student_name}? This cannot be undone.`)) {
      return
    }

    try {
      // Delete via API (needs admin privileges)
      const response = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: student.id }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete student')
      }

      fetchStudents()
      toast.success('Student deleted successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete student')
    }
  }

  const openEditModal = (student: Profile) => {
    setSelectedStudent(student)
    setFormData({
      email: student.email,
      parentName: student.parent_name,
      studentName: student.student_name,
      costPerHour: student.cost_per_hour.toString(),
      timezone: student.timezone,
    })
    setIsEditModalOpen(true)
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
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
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Students</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your students and their accounts
            </p>
          </div>
          <Button
            onClick={() => {
              setFormData({
                email: '',
                parentName: '',
                studentName: '',
                costPerHour: '',
                timezone: 'Europe/London',
              })
              setIsAddModalOpen(true)
            }}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            Add Student
          </Button>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
          />
        </div>

        {/* Active Students */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Active Students ({activeStudents.length})
          </h2>
          <div className="grid gap-4">
            {activeStudents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {searchQuery ? 'No active students match your search' : 'No active students'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeStudents.map((student, idx) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card hover>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary-600">
                            {(student.student_name || student.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {student.student_name || 'No name'}
                          </h3>
                          {student.parent_name && (
                            <p className="text-sm text-gray-500">
                              Parent: {student.parent_name}
                            </p>
                          )}
                          <p className="text-sm text-gray-400">{student.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Rate</p>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(student.cost_per_hour)}/hr
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Balance</p>
                          <p
                            className={`font-medium ${
                              (balancesByStudent[student.id] ?? 0) < 0
                                ? 'text-coral-600'
                                : 'text-mint-600'
                            }`}
                          >
                            {formatCurrency(balancesByStudent[student.id] ?? 0)}
                          </p>
                        </div>
                        <Badge
                          variant={student.password_changed ? 'success' : 'warning'}
                        >
                          {student.password_changed ? 'Active' : 'Temp Password'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(student)}
                            title="Edit student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(student)}
                            title="Set as inactive"
                            className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                          {/* Spacer */}
                          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStudent(student)}
                            title="Delete student"
                            className="text-coral-600 hover:bg-coral-50 dark:hover:bg-coral-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Inactive Students */}
        {inactiveStudents.length > 0 && (
          <div className="space-y-4 mt-8">
            <h2 className="text-lg font-semibold text-gray-500">
              Inactive Students ({inactiveStudents.length})
            </h2>
            <div className="grid gap-4">
              {inactiveStudents.map((student, idx) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="opacity-60">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                          <span className="text-lg font-bold text-gray-400">
                            {(student.student_name || student.email).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-500">
                            {student.student_name || 'No name'}
                          </h3>
                          {student.parent_name && (
                            <p className="text-sm text-gray-400">
                              Parent: {student.parent_name}
                            </p>
                          )}
                          <p className="text-sm text-gray-400">{student.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Rate</p>
                          <p className="font-medium text-gray-500">
                            {formatCurrency(student.cost_per_hour)}/hr
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Balance</p>
                          <p
                            className={`font-medium ${
                              (balancesByStudent[student.id] ?? 0) < 0
                                ? 'text-coral-400'
                                : 'text-mint-400'
                            }`}
                          >
                            {formatCurrency(balancesByStudent[student.id] ?? 0)}
                          </p>
                        </div>
                        <Badge variant="neutral">Inactive</Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(student)}
                            title="Edit student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(student)}
                            title="Reactivate student"
                            className="text-mint-600 hover:bg-mint-50"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStudent(student)}
                            title="Delete student"
                            className="text-coral-600 hover:bg-coral-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student"
        description="Create a new student account"
        size="lg"
      >
        <form onSubmit={handleAddStudent} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            leftIcon={<Mail className="w-5 h-5" />}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Parent Name"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
              leftIcon={<User className="w-5 h-5" />}
              placeholder="e.g. Sarah"
            />
            <Input
              label="Children Names"
              value={formData.studentName}
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              leftIcon={<User className="w-5 h-5" />}
              placeholder="e.g. Harrison, Emily"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
            For multiple children, separate names with commas. They share the same balance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cost Per Hour (£)"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPerHour}
              onChange={(e) => setFormData({ ...formData, costPerHour: e.target.value })}
              leftIcon={<PoundSterling className="w-5 h-5" />}
              required
            />
            <Select
              label="Timezone"
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              options={TIMEZONES}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student"
        description="Update student details"
        size="lg"
      >
        <form onSubmit={handleEditStudent} className="space-y-6">
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            disabled
            leftIcon={<Mail className="w-5 h-5" />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Parent Name"
              value={formData.parentName}
              onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
              leftIcon={<User className="w-5 h-5" />}
              placeholder="e.g. Sarah"
            />
            <Input
              label="Children Names"
              value={formData.studentName}
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              leftIcon={<User className="w-5 h-5" />}
              placeholder="e.g. Harrison, Emily"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
            For multiple children, separate names with commas. They share the same balance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cost Per Hour (£)"
              type="number"
              step="0.01"
              min="0"
              value={formData.costPerHour}
              onChange={(e) => setFormData({ ...formData, costPerHour: e.target.value })}
              leftIcon={<PoundSterling className="w-5 h-5" />}
              required
            />
            <Input
              label="Current Balance (£)"
              type="text"
              value={
                selectedStudent
                  ? formatCurrency(balancesByStudent[selectedStudent.id] ?? 0)
                  : formatCurrency(0)
              }
              disabled
              leftIcon={<PoundSterling className="w-5 h-5" />}
            />
          </div>
          <Select
            label="Timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            options={TIMEZONES}
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Update Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        isOpen={isCredentialsModalOpen}
        onClose={() => {
          setIsCredentialsModalOpen(false)
          setNewCredentials(null)
        }}
        title="Student Created!"
        description="Share these credentials with the student"
        size="md"
      >
        {newCredentials && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-mint-50 to-accent-50 border border-mint-200">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-white rounded-lg text-gray-900 font-mono">
                      {newCredentials.email}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(newCredentials.email, 'email')}
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-4 h-4 text-mint-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    Temporary Password
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-white rounded-lg text-gray-900 font-mono">
                      {newCredentials.password}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(newCredentials.password, 'password')}
                    >
                      {copiedField === 'password' ? (
                        <Check className="w-4 h-4 text-mint-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              <strong>Important:</strong> Ask the student to change their password after first login.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setIsCredentialsModalOpen(false)
                setNewCredentials(null)
              }}
            >
              Done
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

