import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { getThemeInitScript } from '@/lib/theme'

export const metadata: Metadata = {
  title: "Luca's Tutoring - Online Tutoring Made Simple",
  description: 'Book and manage your tutoring lessons with ease',
}

// Script to track visual viewport and set CSS variable for bottom nav positioning
const visualViewportScript = `
(function() {
  function updateVV() {
    var vv = window.visualViewport;
    if (!vv) return;
    var bottomOffset = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    document.documentElement.style.setProperty('--vv-bottom', bottomOffset + 'px');
  }
  updateVV();
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateVV);
    window.visualViewport.addEventListener('scroll', updateVV);
  }
  window.addEventListener('resize', updateVV);
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <script dangerouslySetInnerHTML={{ __html: visualViewportScript }} />
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

