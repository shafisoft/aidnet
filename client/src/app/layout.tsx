import type { Metadata } from 'next'
import { Inter, Noto_Sans_Bengali } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { OrganizationProvider } from '@/hooks/useOrganization'
import { RouteAccessGuard } from '@/components/auth/RouteAccessGuard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { I18nProvider } from '@/i18n/I18nProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
})

export const metadata: Metadata = {
  title: 'AidNet',
  description:
    'Launch verified charity campaigns and donate directly to organizations.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="bn">
      <body className={`${inter.variable} ${notoBengali.variable} antialiased`}>
        <I18nProvider>
          <AuthProvider>
            <RouteAccessGuard>
              <ErrorBoundary>
                <OrganizationProvider>{children}</OrganizationProvider>
              </ErrorBoundary>
            </RouteAccessGuard>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
