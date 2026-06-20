'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import CheckoutProgress from '@/components/shared/CheckoutProgress'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const { lang, plan, setUser } = useCheckoutStore()
  const tr = useTranslation(lang)

  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    password: '', confirmPassword: '', terms: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError(lang === 'es' ? 'Las contraseñas no coinciden.' : 'Passwords do not match.')
      return
    }
    if (!form.terms) {
      setError(lang === 'es' ? 'Debes aceptar los términos.' : 'You must accept the terms.')
      return
    }
    if (form.password.length < 6) {
      setError(lang === 'es' ? 'La contraseña debe tener al menos 6 caracteres.' : 'Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name, phone: form.phone, company: form.company },
        },
      })

      if (authError) throw authError

      const userId = authData.user?.id
      if (userId) {
        await supabase.from('profiles').upsert({
          id: userId,
          email: form.email,
          name: form.name,
          phone: form.phone,
          company: form.company || null,
          role: 'client',
        })
      }

      setUser({ id: userId, email: form.email, name: form.name, phone: form.phone, company: form.company })

      // Navigate based on plan flow
      const nextStep = plan?.flow?.[1]
      if (nextStep === 'configure-hosting') {
        router.push('/checkout/configure-hosting')
      } else if (nextStep === 'addons') {
        router.push('/checkout/addons')
      } else {
        router.push('/checkout/addons')
      }
    } catch (err) {
      setError(err.message || (lang === 'es' ? 'Error al crear la cuenta.' : 'Error creating account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CheckoutProgress current="register" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-[24px] border border-[var(--ntx-border)] p-8 shadow-sm fade-up">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-[var(--ntx-dark)]">{tr('register.title')}</h1>
            <p className="text-gray-500 mt-1 text-sm">{tr('register.subtitle')}</p>
            {plan && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[var(--ntx-orange)] bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">
                Plan seleccionado: {plan.name}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tr('register.name')}</label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Juan García"
                className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tr('register.email')}</label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="juan@empresa.com"
                className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tr('register.phone')}</label>
              <input
                type="tel"
                name="phone"
                required
                value={form.phone}
                onChange={handleChange}
                placeholder="+51 999 999 999"
                className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
              />
            </div>

            {/* Company */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tr('register.company')}</label>
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder={lang === 'es' ? 'Mi Empresa S.A.C.' : 'My Company Inc.'}
                className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tr('register.password')}</label>
              <input
                type="password"
                name="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{tr('register.confirm_password')}</label>
              <input
                type="password"
                name="confirmPassword"
                required
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
              />
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="terms"
                checked={form.terms}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 rounded accent-[var(--ntx-orange)]"
              />
              <span className="text-xs text-gray-600">
                {tr('register.terms')}{' '}
                <Link href="/terms" className="text-[var(--ntx-orange)] underline">{lang === 'es' ? 'Ver términos' : 'View terms'}</Link>
              </span>
            </label>

            {/* Error */}
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[var(--ntx-orange)] text-white font-bold rounded-full transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? (lang === 'es' ? 'Creando cuenta...' : 'Creating account...')
                : tr('register.submit')
              }
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {tr('register.or_login')}{' '}
            <Link href="/account/login" className="text-[var(--ntx-orange)] font-semibold hover:underline">
              {tr('register.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
