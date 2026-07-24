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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL
      ? `https://${process.env.NEXT_PUBLIC_SITE_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000',
  ),
  title: {
    default: 'IBEE',
    template: '%s — IBEE',
  },
  description: 'La plateforme des solopreneurs',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'IBEE',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IBEE',
    description: 'La plateforme des solopreneurs',
  },
  alternates: {
    languages: {
      'fr-FR': '/',
      'x-default': '/',
    },
  },
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
