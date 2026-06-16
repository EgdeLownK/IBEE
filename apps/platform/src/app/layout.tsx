import type { Metadata } from 'next'
import { Poppins, Roboto } from 'next/font/google'
import { Toaster } from 'sonner'
import { AppProviders } from '@/components/providers/AppProviders'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'IBEE',
    template: '%s — IBEE',
  },
  description: 'La plateforme des solopreneurs',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${poppins.variable} ${roboto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
