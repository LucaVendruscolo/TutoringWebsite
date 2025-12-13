'use client'

import { Moon, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'
import { useTheme } from '@/components/providers/ThemeProvider'

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme()

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
      </div>
    </DashboardLayout>
  )
}


