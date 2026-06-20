'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useCheckoutStore } from '@/store/checkout'

export default function Header() {
  const { lang, setLang, currency, setCurrency } = useCheckoutStore()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[var(--ntx-border)]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-black text-lg tracking-tight">
          <span className="text-[var(--ntx-orange)]">N</span>ithrox
        </Link>

        {/* Center nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-[var(--ntx-orange)] transition-colors">
            {lang === 'es' ? 'Planes' : 'Plans'}
          </Link>
          <Link href="#" className="hover:text-[var(--ntx-orange)] transition-colors">
            {lang === 'es' ? 'Nosotros' : 'About'}
          </Link>
          <Link href="#" className="hover:text-[var(--ntx-orange)] transition-colors">
            {lang === 'es' ? 'Contacto' : 'Contact'}
          </Link>
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Currency toggle */}
          <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-xs font-bold">
            <button
              onClick={() => setCurrency('PEN')}
              className={`px-3 py-1.5 rounded-full transition-all ${currency === 'PEN' ? 'bg-white shadow text-[var(--ntx-dark)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              S/
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-full transition-all ${currency === 'USD' ? 'bg-white shadow text-[var(--ntx-dark)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              $
            </button>
          </div>

          {/* Language toggle */}
          <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-xs font-bold">
            <button
              onClick={() => setLang('es')}
              className={`px-3 py-1.5 rounded-full transition-all ${lang === 'es' ? 'bg-white shadow text-[var(--ntx-dark)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ES
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1.5 rounded-full transition-all ${lang === 'en' ? 'bg-white shadow text-[var(--ntx-dark)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              EN
            </button>
          </div>

          <Link
            href="/register"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[var(--ntx-orange)] text-white rounded-full hover:opacity-90 transition-opacity"
          >
            {lang === 'es' ? 'Empezar' : 'Get started'}
          </Link>
        </div>
      </div>
    </header>
  )
}
