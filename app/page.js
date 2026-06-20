'use client'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import { useCheckoutStore } from '@/store/checkout'
import { DEFAULT_PLANS, formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'

export default function HomePage() {
  const router = useRouter()
  const { lang, currency, setPlan } = useCheckoutStore()
  const tr = useTranslation(lang)

  function handleSelect(plan) {
    setPlan(plan)
    router.push('/register')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--ntx-orange)] mb-4">Nithrox Agency</p>
        <h1 className="text-5xl md:text-6xl font-black leading-tight text-[var(--ntx-dark)] mb-4">
          {tr('plans.title')}
        </h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto">
          {tr('plans.subtitle')}
        </p>
      </section>

      {/* Plan Cards */}
      <section className="flex-1 pb-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {DEFAULT_PLANS.map((plan, idx) => {
            const isPopular = plan.id === 'business'
            const features = plan.features[lang] || plan.features.es
            const billingLabel = plan.billing_label[lang] || plan.billing_label.es

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-[24px] border border-[var(--ntx-border)] p-8 flex flex-col gap-6 transition-all duration-300 hover:shadow-xl fade-up ${
                  isPopular ? 'scale-[1.03] shadow-lg md:-mt-2 md:-mb-2 border-[var(--ntx-orange)]/30' : 'hover:-translate-y-1'
                }`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-[var(--ntx-orange)] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                      ⭐ {tr('plans.popular')}
                    </span>
                  </div>
                )}

                {/* Plan name & tagline */}
                <div>
                  <h2 className="text-2xl font-black text-[var(--ntx-dark)]">{plan.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{plan.tagline}</p>
                </div>

                <hr className="border-[var(--ntx-border)]" />

                {/* Price */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {tr('plans.from')}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-[var(--ntx-dark)]">
                      {formatPrice(plan.price_pen, currency)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{billingLabel}</p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSelect(plan)}
                  className={`w-full py-3.5 rounded-full font-bold text-sm transition-all hover:opacity-90 active:scale-95 ${
                    isPopular
                      ? 'bg-[var(--ntx-orange)] text-white shadow-md shadow-orange-200'
                      : 'bg-[var(--ntx-dark)] text-white'
                  }`}
                >
                  {tr('plans.get')} {plan.name} →
                </button>

                <hr className="border-[var(--ntx-border)]" />

                {/* Features */}
                <ul className="flex flex-col gap-2.5">
                  {features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer strip */}
      <footer className="border-t border-[var(--ntx-border)] py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Nithrox · Lima, Perú · hola@nithrox.com
      </footer>
    </div>
  )
}
