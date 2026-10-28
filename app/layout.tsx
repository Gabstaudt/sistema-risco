import type { Metadata, Viewport } from 'next'
import { Manrope, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { AuthProvider } from '@/lib/auth'
import { DataProvider } from '@/lib/data-context'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-manrope' })
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-ibm-plex-sans' })
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-ibm-plex-mono' })

export const metadata: Metadata = {
  title: 'MedRisk Pro | Sistema de Avaliacao de Risco Cirurgico',
  description: 'Sistema hospitalar completo para avaliacao de risco cirurgico pre-operatorio',
  applicationName: 'MedRisk Pro',
  manifest: '/site.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-16.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1E4A38',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${manrope.variable} ${plexSans.variable} ${plexMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
