'use client'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { HOSTING_TIERS, formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { HardDrive, Mail, Database, Check } from 'lucide-react'

export default function HostingPage() {
  const router = useRouter()
  const { lang, currency, plan, hosting: selectedHosting, setHosting } = useCheckoutStore()
  const tr = useTranslation(lang)

  return (
    <div className="slide-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Elige tu hosting' : 'Choose your hosting'}
        subtitle={lang === 'es'
          ? 'El tier recomendado viene preseleccionado según tu plan.'
          : 'The recommended tier is preselected for your plan.'}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {HOSTING_TIERS.map((tier, idx) => {
          const isRecommended = tier.recommended_for.includes(plan?.id)
          const isSelected    = selectedHosting?.id === tier.id
          const tierName      = tier.name[lang] || tier.name.es

          return (
            <div
              key={tier.id}
              onClick={() => setHosting(tier)}
              className="fade-up"
              style={{
                animationDelay: `${idx * 60}ms`,
                position: 'relative',
                background: isSelected ? 'var(--orange-tint)' : 'var(--surface)',
                border: isSelected ? '2px solid var(--orange)' : '1.5px solid var(--border)',
                borderRadius: 16,
                padding: '20px 24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                transition: 'border-color 0.15s, background 0.15s',
              }}
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

              {/* Tier name */}
              <div style={{ minWidth: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{tierName}</span>
                  {isRecommended && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      background: 'var(--orange)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {lang === 'es' ? 'Recomendado' : 'Recommended'}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 6 }}>
                  {tier.price_pen === 0
                    ? <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>
                        {lang === 'es' ? 'Incluido en tu plan' : 'Included in your plan'}
                      </span>
                    : <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)' }}>
                        {formatPrice(tier.price_pen, currency)}<span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>/año</span>
                      </span>
                  }
                </div>
              </div>

              {/* Features grid */}
              <div style={{ display: 'flex', gap: 24, flex: 1, flexWrap: 'wrap' }}>
                <FeaturePill icon={<HardDrive size={14} />} label={tier.disk} sub={lang === 'es' ? 'SSD NVMe' : 'NVMe SSD'} />
                <FeaturePill icon={<Mail size={14} />} label={tier.emails === 999 ? '∞' : tier.emails} sub={lang === 'es' ? 'cuentas email' : 'email accounts'} />
                <FeaturePill icon={<Database size={14} />} label={tier.databases} sub={lang === 'es' ? 'bases de datos' : 'databases'} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <button
          onClick={() => router.push('/checkout/account')}
          style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>
        <button
          disabled={!selectedHosting}
          onClick={() => router.push('/checkout/domain')}
          style={{
            padding: '14px 28px',
            background: selectedHosting ? 'var(--orange)' : 'var(--border)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: selectedHosting ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={e => { if (selectedHosting) e.currentTarget.style.background = 'var(--orange-hover)' }}
          onMouseLeave={e => { if (selectedHosting) e.currentTarget.style.background = 'var(--orange)' }}
        >
          {lang === 'es' ? 'Continuar' : 'Continue'} →
        </button>
      </div>
    </div>
  )
}

function FeaturePill({ icon, label, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 80 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-2)' }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{label}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{sub}</div>
    </div>
  )
}
