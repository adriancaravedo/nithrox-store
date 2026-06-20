import './globals.css'

export const metadata = {
  title: 'Nithrox — Tu agencia digital',
  description: 'Hosting, dominios, websites y más para tu negocio.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
