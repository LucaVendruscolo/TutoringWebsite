import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { getThemeInitScript } from '@/lib/theme'

export const metadata: Metadata = {
  title: "Luca's Tutoring - Online Tutoring Made Simple",
  description: 'Book and manage your tutoring lessons with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <ThemeProvider>
        <div className="bg-abstract" />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
              borderRadius: '12px',
              padding: '16px',
                boxShadow: 'var(--toast-shadow)',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff4757',
                secondary: '#fff',
              },
            },
          }}
        />
        </ThemeProvider>
      </body>
    </html>
  )
}

