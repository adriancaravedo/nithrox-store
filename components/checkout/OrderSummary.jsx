'use client'
import { useState } from 'react'
import { useCheckoutStore } from '@/store/checkout'
import { formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import { Server, Globe, Package, Tag, ShoppingCart } from 'lucide-react'

export default function OrderSummary() {
  const { plan, hosting, domain, addons, customization, currency, lang, promoCode, promoDiscount, applyPromo, getTotal, saveProgress, kitDigitalOfferAccepted } = useCheckoutStore()
  const tr = useTranslation(lang)
  const [promoInput, setPromoInput] = useState(promoCode || '')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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
        body: JSON.stringify({ code: promoInput.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        applyPromo(promoInput.trim(), data.discount)
      } else {
        setPromoError(lang === 'es' ? 'Código inválido o expirado' : 'Invalid or expired code')
      }
    } catch {
      setPromoError(lang === 'es' ? 'Error al validar el código' : 'Error validating code')
    } finally {
      setPromoLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveProgress?.()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  if (!plan) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textAlign: 'center', padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <ShoppingCart size={32} color="var(--border)" />
          <span>{lang === 'es' ? 'Sin plan seleccionado' : 'No plan selected'}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {lang === 'es' ? 'Tu pedido' : 'Your order'}
      </div>

      {/* Plan */}
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 12,
        padding: '14px 16px',
        borderLeft: '3px solid var(--orange)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{plan.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
              {plan.billing_label?.[lang] || plan.billing_label?.es || ''}
              {kitDigitalOfferAccepted && plan.id === 'kit-digital' && (
                <span style={{ color: 'var(--green)', fontWeight: 700 }}> · 1 mes gratis</span>
              )}
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--orange)', whiteSpace: 'nowrap' }}>
            {formatPrice(plan.price_pen, currency)}
          </div>
        </div>
      </div>

      {/* Hosting */}
      {hosting && (
        <SummaryRow
          icon={<Server size={14} color="var(--text-2)" />}
          label={hosting._noHosting
            ? (lang === 'es' ? 'Sin hosting' : 'No hosting')
            : `Hosting ${hosting.name?.[lang] || hosting.name?.es || ''}`
          }
          value={hosting._noHosting
            ? <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
            : hosting.price_pen === 0
            ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', background: 'rgba(22,163,74,0.1)', padding: '2px 8px', borderRadius: 999 }}>
                {lang === 'es' ? 'Incluido' : 'Included'}
              </span>
            : formatPrice(hosting.price_pen, currency)
          }
        />
      )}

      {/* Domain */}
      {domain && (
        <SummaryRow
          icon={<Globe size={14} color="var(--text-2)" />}
          label={domain.full}
          value={domain.price_pen === 0
            ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', background: 'var(--orange-tint)', padding: '2px 8px', borderRadius: 999 }}>
                {lang === 'es' ? 'Gratis 1er año' : 'Free 1st year'}
              </span>
            : formatPrice(domain.price_pen, currency)
          }
        />
      )}

      {/* Pages extra */}
      {pagesExtra > 0 && (
        <SummaryRow
          icon={<span style={{ fontSize: 13 }}>📄</span>}
          label={lang === 'es' ? 'Páginas adicionales' : 'Extra pages'}
          value={`+ ${formatPrice(pagesExtra, currency)}`}
        />
      )}

      {/* Addons */}
      {addons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {lang === 'es' ? 'Extras' : 'Add-ons'}
          </div>
          {addons.map(addon => (
            <SummaryRow
              key={addon.id}
              icon={<span style={{ fontSize: 13 }}>{addon.icon}</span>}
              label={typeof addon.name === 'object' ? (addon.name?.[lang] || addon.name?.es || addon.name) : addon.name}
              value={formatPrice(addon.price_pen, currency)}
            />
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Promo code */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {lang === 'es' ? 'Código de descuento' : 'Promo code'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={promoInput}
            onChange={e => { setPromoInput(e.target.value); setPromoError('') }}
            placeholder={lang === 'es' ? 'CODIGO' : 'PROMO'}
            style={{ flex: 1, fontSize: 13, padding: '9px 12px' }}
            onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading || !promoInput.trim()}
            style={{
              padding: '9px 14px',
              background: 'var(--orange)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              cursor: promoLoading || !promoInput.trim() ? 'not-allowed' : 'pointer',
              opacity: promoLoading || !promoInput.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {promoLoading ? '...' : (lang === 'es' ? 'Aplicar' : 'Apply')}
          </button>
        </div>
        {promoError && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>{promoError}</div>}
        {promoCode && !promoError && (
          <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 6, fontWeight: 600 }}>
            {lang === 'es' ? `Código "${promoCode}" aplicado — ${promoDiscount}% de descuento` : `Code "${promoCode}" applied — ${promoDiscount}% off`}
          </div>
        )}
      </div>

      {/* Totals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)' }}>
          <span>{lang === 'es' ? 'Subtotal' : 'Subtotal'}</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--green)' }}>
            <span>{lang === 'es' ? 'Descuento' : 'Discount'}</span>
            <span>- {formatPrice(discount, currency)}</span>
          </div>
        )}
        <div style={{ height: 1, background: 'var(--border)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Total</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{formatPrice(total, currency)}</span>
        </div>
      </div>

      {/* Save progress */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '11px',
          background: 'transparent',
          border: '1.5px solid var(--border)',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          color: saved ? 'var(--green)' : 'var(--text-2)',
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'border-color 0.15s, color 0.15s',
        }}
      >
        {saving
          ? <><span className="spinner spinner-dark" />{lang === 'es' ? 'Guardando...' : 'Saving...'}</>
          : saved
          ? (lang === 'es' ? '✓ Progreso guardado' : '✓ Progress saved')
          : (lang === 'es' ? 'Guardar progreso' : 'Save progress')
        }
      </button>
    </div>
  )
}

function SummaryRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}
