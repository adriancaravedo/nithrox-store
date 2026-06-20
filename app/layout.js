import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata = {
  title: 'Nithrox — Servicios digitales',
  description: 'Hosting, dominios, websites y más para tu negocio.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`h-full ${manrope.variable}`}>
      <body className={`min-h-full flex flex-col font-[family-name:var(--font-manrope)]`}>
        {children}
      </body>
    </html>
  )
}
