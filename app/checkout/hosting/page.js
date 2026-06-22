'use client'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { HOSTING_TIERS, formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { HardDrive, Mail, Database, Check, ServerOff } from 'lucide-react'

const NO_HOSTING = { id: 'none', _noHosting: true }

export default function HostingPage() {
  const router = useRouter()
  const { lang, currency, plan, hosting: selectedHosting, setHosting } = useCheckoutStore()
  const tr = useTranslation(lang)

  const isKitDigital = plan?.id === 'kit-digital'
  const showNoHosting = !isKitDigital
  const isNoneSelected = selectedHosting?._noHosting === true
  const canContinue = !!selectedHosting

  return (
    <div className="slide-in" style={{ maxWidth: 680, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Elige tu hosting' : 'Choose your hosting'}
        subtitle={lang === 'es'
          ? 'El tier recomendado viene preseleccionado según tu plan.'
          : 'The recommended tier is preselected for your plan.'}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {HOSTING_TIERS.map((tier, idx) => {
          const isRecommended = tier.recommended_for.includes(plan?.id)
          const isSelected    = !isNoneSelected && selectedHosting?.id === tier.id
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
                borderRadius: 14,
                padding: '16px 20px',
                cursor: 'pointer',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 16,
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
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 22, height: 22, background: 'var(--orange)',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={12} color="white" strokeWidth={3} />
                </div>
              )}

              {/* Name + price */}
              <div style={{ minWidth: 130 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tierName}</span>
                  {isRecommended && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, background: 'var(--orange)', color: 'white',
                      padding: '2px 8px', borderRadius: 999,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {lang === 'es' ? 'Recomendado' : 'Recommended'}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 5 }}>
                  {tier.price_pen === 0
                    ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                        {lang === 'es' ? 'Incluido en tu plan' : 'Included in your plan'}
                      </span>
                    : <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--orange)' }}>
                        {formatPrice(tier.price_pen, currency)}
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>/año</span>
                      </span>
                  }
                </div>
              </div>

              {/* Features */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1 }}>
                <FeaturePill icon={<HardDrive size={13} />} label={tier.disk} sub={lang === 'es' ? 'SSD NVMe' : 'NVMe SSD'} />
                <FeaturePill icon={<Mail size={13} />} label={tier.emails === 999 ? '∞' : tier.emails} sub={lang === 'es' ? 'emails corp.' : 'corp. emails'} />
                <FeaturePill icon={<Database size={13} />} label={tier.databases} sub={lang === 'es' ? 'bases de datos' : 'databases'} />
              </div>
            </div>
          )
        })}

        {/* No hosting option — hidden for Kit Digital */}
        {showNoHosting && (
          <div
            onClick={() => setHosting(NO_HOSTING)}
            className="fade-up"
            style={{
              animationDelay: `${HOSTING_TIERS.length * 60}ms`,
              position: 'relative',
              background: isNoneSelected ? 'rgba(107,114,128,0.06)' : 'var(--surface)',
              border: isNoneSelected ? '2px solid #6B7280' : '1.5px dashed var(--border)',
              borderRadius: 14,
              padding: '16px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => {
              if (!isNoneSelected) e.currentTarget.style.borderColor = '#9CA3AF'
            }}
            onMouseLeave={e => {
              if (!isNoneSelected) e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            {isNoneSelected && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                width: 22, height: 22, background: '#6B7280',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={12} color="white" strokeWidth={3} />
              </div>
            )}
            <ServerOff size={20} color="var(--text-3)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>
                {lang === 'es' ? 'No necesito hosting' : "I don't need hosting"}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                {lang === 'es' ? 'Ya tengo un servidor o no lo requiero por ahora' : "I already have a server or don't need one yet"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
        <button
          onClick={() => router.push(plan?.customize_step ? '/checkout/customize' : '/checkout/account')}
          style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}
        >
          {lang === 'es' ? '← Atrás' : '← Back'}
        </button>
        <button
          disabled={!canContinue}
          onClick={() => router.push('/checkout/domain')}
          style={{
            flex: 1,
            padding: '14px 28px',
            background: canContinue ? 'var(--orange)' : 'var(--border)',
            color: 'white', border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 700,
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={e => { if (canContinue) e.currentTarget.style.background = 'var(--orange-hover)' }}
          onMouseLeave={e => { if (canContinue) e.currentTarget.style.background = 'var(--orange)' }}
        >
          {lang === 'es' ? 'Continuar →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

function FeaturePill({ icon, label, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 64 }}>
      <div style={{ color: 'var(--text-3)' }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{label}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500, lineHeight: 1.3 }}>{sub}</div>
    </div>
  )
}
