'use client'

import { useState, useEffect } from 'react'
import { Moon, ArrowLeft, Calendar, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { useTheme } from '@/components/providers/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme()
  const [userId, setUserId] = useState<string | null>(null)
  const [copiedCalendarLink, setCopiedCalendarLink] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    getUser()
  }, [supabase])

  // Generate calendar subscription URL for admin (all students)
  const getCalendarUrl = () => {
    if (typeof window === 'undefined' || !userId) return ''
    const baseUrl = window.location.origin
    return `${baseUrl}/api/calendar/admin/feed.ics`
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
    // Google Calendar requires webcal:// protocol for subscription
    const webcalUrl = url.replace('https://', 'webcal://').replace('http://', 'webcal://')
    const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    window.open(googleUrl, '_blank')
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-8 max-w-2xl">
        <div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Customize your admin experience</p>
        </div>

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
                Subscribe to all student lessons in Google Calendar, Apple Calendar, Outlook, or any other calendar app.
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
      </div>
    </DashboardLayout>
  )
}


