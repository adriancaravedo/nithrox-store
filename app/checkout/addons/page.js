'use client'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { DEFAULT_ADDONS, formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Check } from 'lucide-react'

function billingLabel(billing, lang) {
  if (billing === 'month') return lang === 'es' ? '/mes' : '/mo'
  if (billing === 'year')  return lang === 'es' ? '/año' : '/yr'
  return lang === 'es' ? 'pago único' : 'one-time'
}

export default function AddonsPage() {
  const router = useRouter()
  const { lang, currency, plan, addons, toggleAddon } = useCheckoutStore()

  const availableAddons = DEFAULT_ADDONS.filter(a => a.available_for.includes(plan?.id))

  function isAdded(addon) {
    return addons.some(a => a.id === addon.id)
  }

  return (
    <div className="slide-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Mejora tu plan' : 'Enhance your plan'}
        subtitle={lang === 'es'
          ? 'Añade servicios adicionales cuando los necesites.'
          : 'Add extra services whenever you need them.'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {availableAddons.map((addon, idx) => {
          const added   = isAdded(addon)
          const name    = addon.name[lang] || addon.name.es
          const desc    = addon.description[lang] || addon.description.es
          const billing = billingLabel(addon.billing, lang)

          return (
            <div
              key={addon.id}
              className="fade-up"
              style={{
                animationDelay: `${idx * 50}ms`,
                position: 'relative',
                background: added ? 'var(--orange-tint)' : 'var(--surface)',
                border: added ? '2px solid var(--orange)' : '1.5px solid var(--border)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {added && (
                <div style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 20,
                  height: 20,
                  background: 'var(--orange)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={11} color="white" strokeWidth={3} />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{addon.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                    {formatPrice(addon.price_pen, currency)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginLeft: 2 }}>
                    {billing}
                  </span>
                </div>
                <button
                  onClick={() => toggleAddon(addon)}
                  style={{
                    padding: '8px 18px',
                    background: added ? 'var(--orange)' : 'transparent',
                    color: added ? 'white' : 'var(--orange)',
                    border: `1.5px solid var(--orange)`,
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {added
                    ? <><Check size={12} strokeWidth={3} />{lang === 'es' ? 'Agregado' : 'Added'}</>
                    : (lang === 'es' ? 'Agregar' : 'Add')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {availableAddons.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-3)' }}>
          <p>{lang === 'es' ? 'No hay extras disponibles para tu plan.' : 'No add-ons available for your plan.'}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <button
          onClick={() => router.push('/checkout/domain')}
          style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>
        <button
          onClick={() => router.push('/checkout/review')}
          style={{
            padding: '14px 28px',
            background: 'var(--orange)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--orange)'}
        >
          {lang === 'es' ? 'Continuar' : 'Continue'} →
        </button>
      </div>
    </div>
  )
}
