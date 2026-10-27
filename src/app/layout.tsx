import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/context/LanguageContext'
import { ThemeProvider } from '@/context/ThemeContext'

export const metadata: Metadata = {
  title: 'Al-Masar Switchgear ERP | شركة المسار لصناعة اللوحات الكهربائية',
  description: 'نظام إدارة المصنع المتكامل — شركة المسار لصناعة اللوحات الكهربائية | Factory ERP for Al-Masar Switchgear — Electrical Panel Manufacturing',
  keywords: 'ERP, Al-Masar, المسار, switchgear, electrical panels, factory management, لوحات كهربائية, الأردن, Jordan',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('almasar_theme');
                  var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'light') {
                    document.documentElement.classList.add('light-theme');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
