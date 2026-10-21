import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/context/LanguageContext'

export const metadata: Metadata = {
  title: 'Al-Masar Switchgear ERP',
  description: 'Factory Management System for Al-Masar Switchgear — Electrical Panel Manufacturing ERP',
  keywords: 'ERP, factory, electrical panels, switchgear, manufacturing, QC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
