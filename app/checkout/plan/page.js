'use client'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { DEFAULT_PLANS, formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Check } from 'lucide-react'

export default function PlanPage() {
  const router = useRouter()
  const { lang, currency, plan: selectedPlan, setPlan } = useCheckoutStore()
  const tr = useTranslation(lang)

  function handleSelect(plan) {
    setPlan(plan)
  }

  return (
    <div className="slide-in" style={{ maxWidth: 820, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Elige tu plan' : 'Choose your plan'}
        subtitle={lang === 'es' ? 'Todos los planes incluyen hosting y dominio.' : 'All plans include hosting and a domain.'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {DEFAULT_PLANS.map((plan, idx) => {
          const isPopular  = plan.id === 'business'
          const isSelected = selectedPlan?.id === plan.id
          const features   = plan.features[lang] || plan.features.es
          const billing    = plan.billing_label[lang] || plan.billing_label.es

          return (
            <div
              key={plan.id}
              onClick={() => handleSelect(plan)}
              style={{
                position: 'relative',
                background: isSelected ? 'var(--orange-tint)' : 'var(--surface)',
                border: isSelected ? '2px solid var(--orange)' : '1.5px solid var(--border)',
                borderRadius: 16,
                padding: 24,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                animationDelay: `${idx * 60}ms`,
                boxShadow: isSelected ? '0 0 0 4px rgba(232,68,30,0.1)' : 'none',
              }}
              className="fade-up"
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--orange)'
                  e.currentTarget.style.background = 'var(--orange-tint)'
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--surface)'
                }
              }}
            >
              {/* Popular badge */}
              {isPopular && (
                <div style={{
                  position: 'absolute',
                  top: -14,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--orange)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 14px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  {lang === 'es' ? '⭐ Más popular' : '⭐ Most popular'}
                </div>
              )}

              {/* Selected checkmark */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  width: 22,
                  height: 22,
                  background: 'var(--orange)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={12} color="white" strokeWidth={3} />
                </div>
              )}

              {/* Plan name */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{plan.tagline}</div>
              </div>

              {/* Price */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                    {formatPrice(plan.price_pen, currency)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{billing}</div>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {features.map((feat, fi) => (
                  <li key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                    <span style={{
                      flexShrink: 0,
                      marginTop: 1,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: 'rgba(232,68,30,0.12)',
                      color: 'var(--orange)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 800,
                    }}>✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Bottom action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
        <button
          disabled={!selectedPlan}
          onClick={() => router.push('/checkout/account')}
          style={{
            padding: '14px 28px',
            background: selectedPlan ? 'var(--orange)' : 'var(--border)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: selectedPlan ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (selectedPlan) e.currentTarget.style.background = 'var(--orange-hover)' }}
          onMouseLeave={e => { if (selectedPlan) e.currentTarget.style.background = 'var(--orange)' }}
        >
          {lang === 'es' ? 'Continuar' : 'Continue'} →
        </button>
      </div>
    </div>
  )
}
