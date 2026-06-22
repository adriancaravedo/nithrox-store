'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { DEFAULT_PLANS, formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Check, Gift, X, Calendar } from 'lucide-react'

export default function PlanPage() {
  const router = useRouter()
  const { lang, currency, plan: selectedPlan, setPlan, setKitDigitalOffer } = useCheckoutStore()
  const [plans, setPlans] = useState(DEFAULT_PLANS)

  // Load admin-configured plans from Supabase
  useEffect(() => {
    fetch('/api/store/config')
      .then(r => r.json())
      .then(d => { if (d.plans?.length) setPlans(d.plans) })
      .catch(() => {})
  }, [])

  const [showKitOffer, setShowKitOffer] = useState(false)
  const [pendingPlan, setPendingPlan] = useState(null)

  function handleSelect(plan) {
    setPlan(plan)
    if (plan.id === 'kit-digital' && plan.kit_digital_offer) {
      setPendingPlan(plan)
      setShowKitOffer(true)
    }
  }

  function handleAcceptOffer() {
    setKitDigitalOffer(true)
    setShowKitOffer(false)
  }

  function handleDeclineOffer() {
    setKitDigitalOffer(false)
    setShowKitOffer(false)
  }

  function handleContinue() {
    router.push('/checkout/account')
  }

  return (
    <div className="slide-in" style={{ maxWidth: 860, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Elige tu plan' : 'Choose your plan'}
        subtitle={lang === 'es' ? 'Todos los planes incluyen hosting y dominio gratis el primer año.' : 'All plans include hosting and a free domain for the first year.'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        {plans.map((plan, idx) => {
          const isPopular  = plan.id === 'corporativa'
          const isSelected = selectedPlan?.id === plan.id
          const features   = Array.isArray(plan.features) ? plan.features : (plan.features?.[lang] || plan.features?.es || [])
          const billing    = plan.billing_label?.[lang] || plan.billing_label?.es || ''
          const isPhased   = plan.billing === 'phases' || !!plan.payment_schedule

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
                  ⭐ {lang === 'es' ? 'Más popular' : 'Most popular'}
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
                {isPhased && (
                  <div style={{
                    marginTop: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'rgba(232,68,30,0.08)',
                    color: 'var(--orange)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}>
                    <Calendar size={10} />
                    {lang === 'es' ? `Primer pago: ${formatPrice(plan.price_pen * 0.1, currency)}` : `First payment: ${formatPrice(plan.price_pen * 0.1, currency)}`}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
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
          onClick={handleContinue}
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

      {/* Kit Digital — Free Month Offer Modal */}
      {showKitOffer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={handleDeclineOffer}
          />
          <div style={{
            position: 'relative',
            background: 'var(--surface)',
            borderRadius: 24,
            padding: 36,
            maxWidth: 440,
            width: '100%',
            boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
            animation: 'fadeUp 0.25s ease',
          }}>
            <button
              onClick={handleDeclineOffer}
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}
            >
              <X size={18} />
            </button>

            {/* Gift icon */}
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: 'rgba(232,68,30,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Gift size={32} color="var(--orange)" />
            </div>

            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 10, letterSpacing: '-0.02em' }}>
              {lang === 'es' ? '¡Oferta exclusiva para ti!' : 'Exclusive offer for you!'}
            </div>

            <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 8 }}>
              {lang === 'es'
                ? 'Activa tu <strong>Kit Digital hoy</strong> y obtén el <strong>primer mes completamente gratis</strong>. Sin compromisos adicionales.'
                : 'Activate your <strong>Kit Digital today</strong> and get the <strong>first month completely free</strong>. No additional commitments.'
              }
            </div>

            <div style={{
              background: 'rgba(232,68,30,0.06)',
              border: '1px solid rgba(232,68,30,0.15)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(232,68,30,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Calendar size={16} color="var(--orange)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {lang === 'es' ? '13 meses por el precio de 12' : '13 months for the price of 12'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  {lang === 'es' ? `Solo S/ ${pendingPlan?.price_pen} al año` : `Only S/ ${pendingPlan?.price_pen} per year`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleAcceptOffer}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: 'var(--orange)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--orange)'}
              >
                <Gift size={16} />
                {lang === 'es' ? 'Sí, quiero el mes gratis' : 'Yes, I want the free month'}
              </button>
              <button
                onClick={handleDeclineOffer}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'transparent',
                  color: 'var(--text-3)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {lang === 'es' ? 'Continuar sin la oferta' : 'Continue without offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
