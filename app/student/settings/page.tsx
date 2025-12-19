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
  Moon,
  Calendar,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import { createClient } from '@/lib/supabase/client'
import { TIMEZONES } from '@/lib/utils'
import type { Profile } from '@/lib/types'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useTheme } from '@/components/providers/ThemeProvider'

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
  const [copiedCalendarLink, setCopiedCalendarLink] = useState(false)
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  // Generate calendar subscription URL
  const getCalendarUrl = () => {
    if (typeof window === 'undefined' || !profile?.id) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/api/calendar/${profile.id}/feed.ics`
  }

  const copyCalendarLink = async () => {
    const url = getCalendarUrl()
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiedCalendarLink(true)
    toast.success('Calendar link copied!')
    setTimeout(() => setCopiedCalendarLink(false), 3000)
  }

  const openInGoogleCalendar = () => {
    const url = getCalendarUrl()
    if (!url) return
    // Google Calendar subscription URL format
    const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`
    window.open(googleUrl, '_blank')
  }

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
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-300 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
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
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                <div className="flex items-center gap-2 mt-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200/70 dark:border-gray-800">
                  <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-gray-100">{profile?.email}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Contact me to change your email</p>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Lesson times will be displayed in your selected timezone.
              </p>

              <Button type="submit" isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="w-5 h-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Dark mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Toggle between light and dark theme.
                </p>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                aria-label="Toggle dark mode"
              />
            </div>
          </CardContent>
        </Card>

        {/* Calendar Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendar Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Subscribe to your lessons in Google Calendar, Apple Calendar, Outlook, or any other calendar app.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={copyCalendarLink}
                  leftIcon={copiedCalendarLink ? <Check className="w-4 h-4 text-mint-500" /> : <Copy className="w-4 h-4" />}
                  className="flex-1"
                >
                  {copiedCalendarLink ? 'Copied!' : 'Copy Calendar Link'}
                </Button>
                <Button
                  variant="outline"
                  onClick={openInGoogleCalendar}
                  leftIcon={<ExternalLink className="w-4 h-4" />}
                  className="flex-1"
                >
                  Add to Google Calendar
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  For Apple Calendar / Other Apps:
                </p>
                <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Copy the calendar link above</li>
                  <li>In your calendar app, look for "Subscribe to Calendar" or "Add Calendar from URL"</li>
                  <li>Paste the link and save</li>
                </ol>
              </div>
            </div>
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

