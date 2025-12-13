'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Mail,
  Globe,
  Lock,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { createClient } from '@/lib/supabase/client'
import { TIMEZONES } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function StudentSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      setLoading(false)
    }

    fetchProfile()
  }, [supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          student_name: profile.student_name,
          parent_name: profile.parent_name,
          timezone: profile.timezone,
        })
        .eq('id', profile.id)

      if (error) throw error

      toast.success('Settings saved!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match')
      return
    }

    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      })

      if (error) throw error

      // Mark password as changed
      await supabase
        .from('profiles')
        .update({ password_changed: true })
        .eq('id', profile?.id)

      toast.success('Password updated successfully!')
      setPasswords({ current: '', new: '', confirm: '' })
      setShowPasswordForm(false)

      // Refresh profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (profileData) {
          setProfile(profileData)
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password')
    } finally {
      setIsSaving(false)
    }
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
      <div className="space-y-8 max-w-2xl">
        {/* Header */}
        <div>
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your account settings
          </p>
        </div>

        {/* Password Warning */}
        {profile && !profile.password_changed && (
          <Alert variant="warning" title="Temporary Password">
            You're using a temporary password. Please change it below for security.
          </Alert>
        )}

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <div className="flex items-center gap-2 mt-1 p-3 bg-gray-50 rounded-xl">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{profile?.email}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Contact me to change your email</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Student Name"
                  value={profile?.student_name || ''}
                  onChange={(e) =>
                    setProfile(profile ? { ...profile, student_name: e.target.value } : null)
                  }
                  leftIcon={<User className="w-5 h-5" />}
                  required
                />
                <Input
                  label="Parent Name"
                  value={profile?.parent_name || ''}
                  onChange={(e) =>
                    setProfile(profile ? { ...profile, parent_name: e.target.value } : null)
                  }
                  leftIcon={<User className="w-5 h-5" />}
                  required
                />
              </div>

              <Select
                label="Timezone"
                value={profile?.timezone || 'Europe/London'}
                onChange={(e) =>
                  setProfile(profile ? { ...profile, timezone: e.target.value } : null)
                }
                options={TIMEZONES}
              />
              <p className="text-sm text-gray-500">
                Lesson times will be displayed in your selected timezone.
              </p>

              <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password
              {profile?.password_changed && (
                <CheckCircle className="w-4 h-4 text-mint-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showPasswordForm ? (
              <Button
                variant="outline"
                onClick={() => setShowPasswordForm(true)}
              >
                Change Password
              </Button>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  label="New Password"
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new: e.target.value })
                  }
                  leftIcon={<Lock className="w-5 h-5" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="hover:text-gray-600"
                    >
                      {showPasswords ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  }
                  required
                />

                <Input
                  type={showPasswords ? 'text' : 'password'}
                  label="Confirm New Password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  leftIcon={<Lock className="w-5 h-5" />}
                  required
                />

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPasswords({ current: '', new: '', confirm: '' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={isSaving}>
                    Update Password
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

