'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Package, Server, Globe, Pencil, Check } from 'lucide-react'

function billingLabel(billing, lang) {
  if (billing === 'month') return lang === 'es' ? '/mes' : '/mo'
  if (billing === 'year')  return lang === 'es' ? '/año' : '/yr'
  return lang === 'es' ? 'pago único' : 'one-time'
}

function SectionCard({ title, onEdit, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--orange)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <Pencil size={12} />{' '}Editar
          </button>
        )}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function LineItem({ label, value, secondary }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        {secondary && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{secondary}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

export default function ReviewPage() {
  const router = useRouter()
  const { lang, currency, plan, hosting, domain, addons, customization, promoCode, promoDiscount, applyPromo, getTotal, kitDigitalOfferAccepted } = useCheckoutStore()
  const tr = useTranslation(lang)

  const [promoInput, setPromoInput] = useState(promoCode || '')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const pagesExtra = customization?.pagesExtra || 0
  const subtotal = (() => {
    let t = plan ? plan.price_pen : 0
    if (pagesExtra) t += pagesExtra
    addons.forEach(a => { t += a.price_pen })
    if (hosting && !hosting._noHosting && hosting.price_pen) t += hosting.price_pen
    return t
  })()

  const discount = promoDiscount > 0 ? Math.round(subtotal * promoDiscount / 100 * 100) / 100 : 0
  const total = getTotal()

  async function handleApplyPromo() {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    setPromoError('')
    try {
      const res = await fetch('/api/orders/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.valid) {
        applyPromo(promoInput.trim().toUpperCase(), data.discount)
      } else {
        setPromoError(data.message || (lang === 'es' ? 'Código inválido' : 'Invalid code'))
      }
    } catch {
      setPromoError(lang === 'es' ? 'Error al validar' : 'Validation error')
    } finally {
      setPromoLoading(false)
    }
  }

  return (
    <div className="slide-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Revisa tu pedido' : 'Review your order'}
        subtitle={lang === 'es' ? 'Confirma que todo esté correcto antes de firmar.' : 'Confirm everything looks right before signing.'}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Plan */}
        {plan && (
          <SectionCard title={lang === 'es' ? 'Plan seleccionado' : 'Selected plan'} onEdit={() => router.push('/checkout/plan')}>
            <LineItem
              label={plan.name}
              secondary={plan.billing_label?.[lang] || plan.billing_label?.es || ''}
              value={kitDigitalOfferAccepted && plan.id === 'kit-digital'
                ? <span style={{ color: 'var(--green)', fontWeight: 800 }}>S/ 0.00</span>
                : formatPrice(plan.price_pen, currency)
              }
            />
            {kitDigitalOfferAccepted && plan.id === 'kit-digital' && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, padding: '8px 12px', background: 'rgba(22,163,74,0.06)', borderRadius: 8, border: '1px solid rgba(22,163,74,0.15)' }}>
                🎁 {lang === 'es' ? '1 mes gratis incluido. Después del primer mes: S/ 149/año.' : '1 free month included. After the first month: S/ 149/year.'}
              </div>
            )}
            {pagesExtra > 0 && (
              <LineItem
                label={lang === 'es' ? 'Páginas adicionales' : 'Extra pages'}
                secondary=""
                value={`+ ${formatPrice(pagesExtra, currency)}`}
              />
            )}
          </SectionCard>
        )}

        {/* Hosting */}
        {hosting && (
          <SectionCard title="Hosting" onEdit={() => router.push('/checkout/hosting')}>
            <LineItem
              label={hosting._noHosting
                ? (lang === 'es' ? 'Sin hosting' : 'No hosting')
                : (hosting.name?.[lang] || hosting.name?.es || 'Hosting')
              }
              secondary={hosting._noHosting ? undefined : `${hosting.disk} · ${hosting.emails} emails · ${hosting.databases} bases de datos`}
              value={hosting._noHosting ? '—' : hosting.price_pen === 0 ? (lang === 'es' ? 'Incluido' : 'Included') : formatPrice(hosting.price_pen, currency)}
            />
          </SectionCard>
        )}

        {/* Domain */}
        {domain && (
          <SectionCard title={lang === 'es' ? 'Dominio' : 'Domain'} onEdit={() => router.push('/checkout/domain')}>
            <LineItem
              label={domain.full}
              secondary={lang === 'es' ? '1 año de registro' : '1 year registration'}
              value={domain.price_pen === 0 ? (lang === 'es' ? 'Gratis 1er año' : 'Free 1st year') : formatPrice(domain.price_pen, currency)}
            />
          </SectionCard>
        )}

        {/* Addons */}
        {addons.length > 0 && (
          <SectionCard title={lang === 'es' ? 'Extras' : 'Add-ons'} onEdit={() => router.push('/checkout/addons')}>
            {addons.map(addon => (
              <LineItem
                key={addon.id}
                label={typeof addon.name === 'object' ? (addon.name?.[lang] || addon.name?.es || addon.name) : addon.name}
                secondary={billingLabel(addon.billing, lang)}
                value={formatPrice(addon.price_pen, currency)}
              />
            ))}
          </SectionCard>
        )}

        {/* Promo + Totals */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '20px' }}>
          {/* Promo */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {lang === 'es' ? 'Código promocional' : 'Promo code'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
                placeholder="NITHROX10"
                style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'monospace', fontWeight: 600, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              />
              <button
                onClick={handleApplyPromo}
                disabled={promoLoading || !promoInput.trim()}
                style={{
                  padding: '10px 16px',
                  background: 'var(--orange)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: promoLoading || !promoInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: promoLoading || !promoInput.trim() ? 0.5 : 1,
                }}
              >
                {promoLoading ? '...' : (lang === 'es' ? 'Aplicar' : 'Apply')}
              </button>
            </div>
            {promoError && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{promoError}</div>}
            {promoCode && !promoError && (
              <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6, fontWeight: 600 }}>
                ✓ {promoDiscount}% {lang === 'es' ? 'de descuento aplicado' : 'discount applied'}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)' }}>
              <span>{lang === 'es' ? 'Subtotal' : 'Subtotal'}</span>
              <span>{formatPrice(subtotal, currency)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--green)' }}>
                <span>{lang === 'es' ? 'Descuento' : 'Discount'} ({promoDiscount}%)</span>
                <span>− {formatPrice(discount, currency)}</span>
              </div>
            )}
            <div style={{ height: 1, background: 'var(--border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Total</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>

        {/* Confirm checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '16px 20px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16 }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 1, accentColor: 'var(--orange)', flexShrink: 0 }}
          />
          <span style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {lang === 'es'
              ? 'Todo se ve bien. Acepto continuar con la firma del contrato.'
              : 'Everything looks good. I agree to proceed with contract signing.'}
          </span>
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <button
          onClick={() => router.push('/checkout/addons')}
          style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>
        <button
          disabled={!confirmed}
          onClick={() => router.push('/checkout/contract')}
          style={{
            padding: '14px 28px',
            background: confirmed ? 'var(--orange)' : 'var(--border)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: confirmed ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onMouseEnter={e => { if (confirmed) e.currentTarget.style.background = 'var(--orange-hover)' }}
          onMouseLeave={e => { if (confirmed) e.currentTarget.style.background = 'var(--orange)' }}
        >
          {lang === 'es' ? 'Firmar contrato' : 'Sign contract'} →
        </button>
      </div>
    </div>
  )
}
