'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import CheckoutProgress from '@/components/shared/CheckoutProgress'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { HOSTING_TIERS, formatPrice } from '@/lib/data'

export default function ConfigureHostingPage() {
  const router = useRouter()
  const { lang, currency, plan, hosting, setHosting } = useCheckoutStore()
  const tr = useTranslation(lang)
  const [selected, setSelected] = useState(hosting?.id || 'starter')

  // Guard: only for kit-digital
  useEffect(() => {
    if (!plan || plan.id !== 'kit-digital') {
      router.replace('/')
    }
  }, [plan, router])

  function handleContinue() {
    const tier = HOSTING_TIERS.find(t => t.id === selected)
    setHosting(tier)
    router.push('/checkout/configure-domain')
  }

  const icons = { starter: '🚀', pro: '⚡', business: '🏢' }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CheckoutProgress current="configure-hosting" />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <div className="text-center mb-10 fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ntx-orange)] mb-2">Kit Digital</p>
          <h1 className="text-4xl font-black text-[var(--ntx-dark)]">{tr('hosting.title')}</h1>
          <p className="text-gray-500 mt-2">{tr('hosting.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOSTING_TIERS.map((tier, idx) => {
            const isSelected = selected === tier.id
            const isIncluded = tier.price_pen === 0
            const tierName = tier.name[lang] || tier.name.es

            return (
              <button
                key={tier.id}
                onClick={() => setSelected(tier.id)}
                className={`fade-up text-left bg-white rounded-[24px] border-2 p-6 flex flex-col gap-5 transition-all duration-200 hover:shadow-lg ${
                  isSelected
                    ? 'border-[var(--ntx-orange)] shadow-md shadow-orange-100'
                    : 'border-[var(--ntx-border)] hover:border-gray-300'
                }`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">{icons[tier.id]}</span>
                    <h3 className="text-xl font-black text-[var(--ntx-dark)] mt-2">{tierName}</h3>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? 'border-[var(--ntx-orange)] bg-[var(--ntx-orange)]' : 'border-gray-300'
                  }`}>
                    {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                </div>

                {/* Price */}
                <div>
                  {isIncluded ? (
                    <span className="inline-flex items-center text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      {tr('hosting.included')} ✓
                    </span>
                  ) : (
                    <div>
                      <span className="text-2xl font-black text-[var(--ntx-dark)]">{formatPrice(tier.price_pen, currency)}</span>
                      <span className="text-xs text-gray-400 ml-1">{lang === 'es' ? '/año' : '/year'}</span>
                    </div>
                  )}
                </div>

                <hr className="border-[var(--ntx-border)]" />

                {/* Specs */}
                <ul className="flex flex-col gap-2.5 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="text-gray-500">{tr('hosting.disk')}</span>
                    <span className="font-bold text-[var(--ntx-dark)]">{tier.disk}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-500">{tr('hosting.emails')}</span>
                    <span className="font-bold text-[var(--ntx-dark)]">
                      {tier.emails === 999 ? (lang === 'es' ? 'Ilimitados' : 'Unlimited') : tier.emails}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-gray-500">{tr('hosting.databases')}</span>
                    <span className="font-bold text-[var(--ntx-dark)]">{tier.databases}</span>
                  </li>
                </ul>

                {tier.recommended_for.includes(plan?.id) && (
                  <div className="mt-1 text-xs font-semibold text-[var(--ntx-orange)] bg-orange-50 px-3 py-1.5 rounded-full text-center">
                    ⭐ {tr('hosting.recommended')}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Continue */}
        <div className="mt-10 flex justify-end">
          <button
            onClick={handleContinue}
            className="px-8 py-3.5 bg-[var(--ntx-orange)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all shadow-md shadow-orange-200"
          >
            {tr('checkout.next')} →
          </button>
        </div>
      </div>
    </div>
  )
}
