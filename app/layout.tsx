import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { AuthProvider } from '@/lib/auth'
import { DataProvider } from '@/lib/data-context'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})
const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'MedRisk Pro | Sistema de Avaliacao de Risco Cirurgico',
  description: 'Sistema hospitalar completo para avaliacao de risco cirurgico pre-operatorio',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#0D9488',
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
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
