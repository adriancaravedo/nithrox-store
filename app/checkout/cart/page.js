'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import CheckoutProgress from '@/components/shared/CheckoutProgress'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'

export default function CartPage() {
  const router = useRouter()
  const { lang, currency, plan, hosting, domain, addons, promoCode, promoDiscount, applyPromo, getTotal } = useCheckoutStore()
  const tr = useTranslation(lang)

  const [promoInput, setPromoInput] = useState(promoCode || '')
  const [promoMsg, setPromoMsg] = useState('')
  const [promoApplying, setPromoApplying] = useState(false)
  const [promoError, setPromoError] = useState(false)

  const subtotalRaw = (() => {
    let s = plan ? plan.price_pen : 0
    addons.forEach(a => { s += a.price_pen })
    if (hosting?.price_pen) s += hosting.price_pen
    return s
  })()

  const discountAmount = promoDiscount > 0 ? Math.round(subtotalRaw * promoDiscount / 100 * 100) / 100 : 0
  const total = getTotal()

  async function handleApplyPromo() {
    if (!promoInput.trim()) return
    setPromoApplying(true)
    setPromoMsg('')
    setPromoError(false)
    try {
      const res = await fetch('/api/orders/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.valid) {
        applyPromo(promoInput.trim().toUpperCase(), data.discount)
        setPromoMsg(data.message)
        setPromoError(false)
      } else {
        setPromoMsg(data.message)
        setPromoError(true)
      }
    } catch {
      setPromoMsg(lang === 'es' ? 'Error al validar el código.' : 'Error validating code.')
      setPromoError(true)
    } finally {
      setPromoApplying(false)
    }
  }

  const BILLING_LABEL = {
    month: { es: '/mes', en: '/month' },
    year:  { es: '/año', en: '/year' },
    once:  { es: 'pago único', en: 'one-time' },
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CheckoutProgress current="cart" />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="text-center mb-10 fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ntx-orange)] mb-2">
            {lang === 'es' ? 'Resumen' : 'Summary'}
          </p>
          <h1 className="text-4xl font-black text-[var(--ntx-dark)]">{tr('cart.title')}</h1>
        </div>

        <div className="bg-white rounded-[24px] border border-[var(--ntx-border)] overflow-hidden fade-up" style={{ animationDelay: '80ms' }}>
          {/* Items */}
          <div className="p-6 flex flex-col gap-1">

            {/* Plan row */}
            {plan && (
              <div className="flex items-center justify-between py-4 border-b border-[var(--ntx-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center text-lg">📦</div>
                  <div>
                    <p className="font-bold text-[var(--ntx-dark)] text-sm">{tr('cart.plan')}: {plan.name}</p>
                    <p className="text-xs text-gray-400">{plan.billing_label[lang] || plan.billing_label.es}</p>
                  </div>
                </div>
                <span className="font-black text-[var(--ntx-dark)]">{formatPrice(plan.price_pen, currency)}</span>
              </div>
            )}

            {/* Hosting row */}
            {hosting && plan?.id === 'kit-digital' && (
              <div className="flex items-center justify-between py-4 border-b border-[var(--ntx-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-lg">🖥️</div>
                  <div>
                    <p className="font-bold text-[var(--ntx-dark)] text-sm">
                      {tr('cart.hosting')}: {hosting.name?.[lang] || hosting.name?.es || hosting.id}
                    </p>
                    <p className="text-xs text-gray-400">{hosting.disk} · {hosting.emails} {lang === 'es' ? 'emails' : 'emails'}</p>
                  </div>
                </div>
                <span className="font-black text-[var(--ntx-dark)]">
                  {hosting.price_pen === 0 ? (lang === 'es' ? 'Incluido' : 'Included') : formatPrice(hosting.price_pen, currency)}
                </span>
              </div>
            )}

            {/* Domain row */}
            {domain && (
              <div className="flex items-center justify-between py-4 border-b border-[var(--ntx-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-lg">🌐</div>
                  <div>
                    <p className="font-bold text-[var(--ntx-dark)] text-sm">{tr('cart.domain')}: {domain.full}</p>
                    <p className="text-xs text-gray-400">{lang === 'es' ? 'Dominio' : 'Domain'} {domain.tld}</p>
                  </div>
                </div>
                <span className="font-black text-[var(--ntx-dark)]">
                  {domain.free ? (lang === 'es' ? 'Gratis' : 'Free') : formatPrice(domain.price_pen, currency)}
                </span>
              </div>
            )}

            {/* Addons */}
            {addons.map((addon) => {
              const name = addon.name?.[lang] || addon.name?.es || addon.id
              const billingLabel = BILLING_LABEL[addon.billing]?.[lang] || ''
              return (
                <div key={addon.id} className="flex items-center justify-between py-4 border-b border-[var(--ntx-border)] last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-lg">{addon.icon}</div>
                    <div>
                      <p className="font-bold text-[var(--ntx-dark)] text-sm">{name}</p>
                      <p className="text-xs text-gray-400">{billingLabel}</p>
                    </div>
                  </div>
                  <span className="font-black text-[var(--ntx-dark)]">{formatPrice(addon.price_pen, currency)}</span>
                </div>
              )
            })}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 border-t border-[var(--ntx-border)] px-6 py-5 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{tr('cart.subtotal')}</span>
              <span className="font-semibold text-[var(--ntx-dark)]">{formatPrice(subtotalRaw, currency)}</span>
            </div>
            {promoDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-semibold">{tr('cart.discount')} ({promoDiscount}%)</span>
                <span className="font-semibold text-green-600">- {formatPrice(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-[var(--ntx-dark)] pt-2 border-t border-[var(--ntx-border)]">
              <span>{tr('cart.total')}</span>
              <span className="text-[var(--ntx-orange)]">{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Promo code */}
        <div className="mt-5 bg-white rounded-[20px] border border-[var(--ntx-border)] p-5 fade-up" style={{ animationDelay: '160ms' }}>
          <p className="text-sm font-semibold text-gray-600 mb-3">🎫 {tr('cart.promo')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={e => setPromoInput(e.target.value.toUpperCase())}
              placeholder="NITHROX10"
              className="flex-1 px-4 py-3 rounded-xl border border-[var(--ntx-border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all uppercase"
            />
            <button
              onClick={handleApplyPromo}
              disabled={promoApplying || !promoInput}
              className="px-5 py-3 bg-[var(--ntx-dark)] text-white rounded-xl text-sm font-bold hover:opacity-80 transition-all disabled:opacity-50"
            >
              {promoApplying ? '...' : tr('cart.apply')}
            </button>
          </div>
          {promoMsg && (
            <p className={`text-xs mt-2 font-semibold ${promoError ? 'text-red-500' : 'text-green-600'}`}>
              {promoMsg}
            </p>
          )}
        </div>

        {/* Continue */}
        <div className="mt-8 flex items-center justify-between fade-up" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← {tr('checkout.back')}
          </button>
          <button
            onClick={() => router.push('/checkout/contract')}
            className="px-8 py-3.5 bg-[var(--ntx-orange)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all shadow-md shadow-orange-200"
          >
            {tr('cart.proceed')} →
          </button>
        </div>
      </div>
    </div>
  )
}
