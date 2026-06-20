'use client'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import CheckoutProgress from '@/components/shared/CheckoutProgress'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { DEFAULT_ADDONS, formatPrice } from '@/lib/data'

const BILLING_LABEL = {
  month: { es: '/mes', en: '/month' },
  year:  { es: '/año', en: '/year' },
  once:  { es: 'pago único', en: 'one-time' },
}

export default function AddonsPage() {
  const router = useRouter()
  const { lang, currency, plan, addons, toggleAddon, getTotal } = useCheckoutStore()
  const tr = useTranslation(lang)

  const availableAddons = DEFAULT_ADDONS.filter(a => a.available_for.includes(plan?.id))
  const total = getTotal()

  function isAdded(id) {
    return addons.some(a => a.id === id)
  }

  function handleContinue() {
    router.push('/checkout/cart')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CheckoutProgress current="addons" />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 pb-40">
        <div className="text-center mb-10 fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ntx-orange)] mb-2">
            {plan?.name}
          </p>
          <h1 className="text-4xl font-black text-[var(--ntx-dark)]">{tr('addons.title')}</h1>
          <p className="text-gray-500 mt-2">{tr('addons.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableAddons.map((addon, idx) => {
            const added = isAdded(addon.id)
            const name = addon.name[lang] || addon.name.es
            const desc = addon.description[lang] || addon.description.es
            const billingKey = BILLING_LABEL[addon.billing]
            const billingStr = billingKey ? billingKey[lang] || billingKey.es : ''

            return (
              <div
                key={addon.id}
                className={`fade-up bg-white rounded-[24px] border-2 p-6 flex gap-4 items-start transition-all duration-200 ${
                  added
                    ? 'border-[var(--ntx-orange)] shadow-md shadow-orange-100'
                    : 'border-[var(--ntx-border)] hover:border-gray-300 hover:shadow-md'
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-all ${
                  added ? 'bg-orange-50' : 'bg-gray-50'
                }`}>
                  {addon.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-[var(--ntx-dark)] text-base">{name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => toggleAddon(addon)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                        added
                          ? 'bg-orange-100 text-[var(--ntx-orange)] hover:bg-orange-200'
                          : 'bg-[var(--ntx-dark)] text-white hover:opacity-80'
                      }`}
                    >
                      {added ? tr('addons.added') : tr('addons.add')}
                    </button>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    {addon.free ? (
                      <span className="text-sm font-bold text-green-600">{tr('addons.free')}</span>
                    ) : (
                      <>
                        <span className="text-lg font-black text-[var(--ntx-dark)]">
                          {formatPrice(addon.price_pen, currency)}
                        </span>
                        <span className="text-xs text-gray-400">{billingStr}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating price bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
        <div className="max-w-4xl mx-auto bg-[var(--ntx-dark)] rounded-[20px] px-6 py-4 flex items-center justify-between shadow-2xl">
          <div>
            <p className="text-xs text-gray-400 font-medium">
              {lang === 'es' ? 'Total estimado' : 'Estimated total'}
              {addons.length > 0 && (
                <span className="ml-2 bg-[var(--ntx-orange)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  +{addons.length} {lang === 'es' ? 'addon' : 'add-on'}{addons.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
            <p className="text-2xl font-black text-white">{formatPrice(total, currency)}</p>
          </div>
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-[var(--ntx-orange)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all"
          >
            {tr('checkout.next')} →
          </button>
        </div>
      </div>
    </div>
  )
}
