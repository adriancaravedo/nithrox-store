'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Search, Check, Globe, Link2, ShoppingCart, AlertCircle } from 'lucide-react'

const TLDS = [
  { tld: '.com', label: '.com', base_price_pen: 0 },
  { tld: '.pe',  label: '.pe',  base_price_pen: 89 },
  { tld: '.net', label: '.net', base_price_pen: 49 },
  { tld: '.org', label: '.org', base_price_pen: 49 },
  { tld: '.store', label: '.store', base_price_pen: 69 },
]

function isValidDomain(str) {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(str.trim())
}

export default function DomainPage() {
  const router = useRouter()
  const { lang, currency, plan, domain: selectedDomain, setDomain } = useCheckoutStore()
  const tr = useTranslation(lang)

  // 'existing' | 'buy'
  const [mode, setMode] = useState(selectedDomain?.existing ? 'existing' : selectedDomain ? 'buy' : null)

  // — Existing domain state —
  const [existingInput, setExistingInput] = useState(selectedDomain?.existing ? selectedDomain.full : '')
  const [existingError, setExistingError] = useState('')

  // — Buy domain state —
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef(null)

  const isKitDigital = plan?.id === 'kit-digital'

  // ── Buy: check availability on query change ──────────────────
  useEffect(() => {
    if (mode !== 'buy') return
    if (!query.trim()) { setResults({}); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setChecking(true)
      try {
        const checks = await Promise.all(
          TLDS.map(t =>
            fetch(`/api/domains/check?name=${encodeURIComponent(query.trim())}&tld=${encodeURIComponent(t.tld)}`)
              .then(r => r.json())
              .then(d => ({ tld: t.tld, available: d.available }))
              .catch(() => ({ tld: t.tld, available: null }))
          )
        )
        const map = {}
        checks.forEach(c => { map[c.tld] = c.available })
        setResults(map)
      } finally {
        setChecking(false)
      }
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [query, mode])

  function getDomainPrice(tld) {
    if (tld === '.com' && isKitDigital) return 0
    return TLDS.find(t => t.tld === tld)?.base_price_pen ?? 49
  }

  function handleBuySelect(tld) {
    const price = getDomainPrice(tld)
    const name = query.trim().toLowerCase().replace(/\s+/g, '-')
    setDomain({ name, tld, full: `${name}${tld}`, price_pen: price, existing: false })
  }

  function handleExistingConfirm() {
    const raw = existingInput.trim().toLowerCase()
    if (!raw) { setExistingError('Escribe tu dominio'); return }
    if (!isValidDomain(raw)) { setExistingError('Formato inválido. Ejemplo: minegocio.com'); return }
    setExistingError('')
    // Parse tld from domain
    const parts = raw.split('.')
    const tld = parts.length >= 2 ? `.${parts.slice(1).join('.')}` : ''
    const name = parts[0]
    setDomain({ name, tld, full: raw, price_pen: 0, existing: true })
  }

  const domainName = query.trim().toLowerCase().replace(/\s+/g, '-')
  const hasResults = query.trim().length > 0

  const canContinue = !!selectedDomain

  // ── Mode selector ─────────────────────────────────────────────
  if (!mode) {
    return (
      <div className="slide-in" style={{ maxWidth: 600, margin: '0 auto' }}>
        <StepHeader
          title={lang === 'es' ? 'Tu dominio web' : 'Your domain'}
          subtitle={lang === 'es'
            ? 'Elige cómo quieres configurar el dominio de tu sitio.'
            : 'Choose how you want to set up your website domain.'}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          {/* Option A: existing */}
          <button
            onClick={() => setMode('existing')}
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--orange)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--orange-tint)', border: '1.5px solid rgba(232,68,30,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Link2 size={20} color="var(--orange)" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 4px' }}>
                {lang === 'es' ? 'Ya tengo un dominio' : 'I already have a domain'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                {lang === 'es'
                  ? 'Conecta tu dominio existente (minegocio.com, .pe, etc.). Solo necesitas apuntar los DNS hacia nosotros.'
                  : 'Connect your existing domain. You only need to update the DNS records.'}
              </p>
              <span style={{
                display: 'inline-block', marginTop: 10,
                fontSize: 11, fontWeight: 700, color: 'var(--green)',
                background: 'rgba(22,163,74,0.1)', padding: '3px 10px', borderRadius: 999,
              }}>
                {lang === 'es' ? 'Gratis — sin costo adicional' : 'Free — no extra cost'}
              </span>
            </div>
          </button>

          {/* Option B: buy */}
          <button
            onClick={() => setMode('buy')}
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              borderRadius: 16,
              padding: '24px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--orange)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <ShoppingCart size={20} color="#6366f1" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 4px' }}>
                {lang === 'es' ? 'Quiero comprar un dominio' : 'I want to register a new domain'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                {lang === 'es'
                  ? 'Busca y registra un dominio nuevo. El .com es gratis el primer año con Kit Digital.'
                  : 'Search and register a new domain. .com is free the first year with Kit Digital.'}
              </p>
              {isKitDigital && (
                <span style={{
                  display: 'inline-block', marginTop: 10,
                  fontSize: 11, fontWeight: 700, color: 'var(--orange)',
                  background: 'var(--orange-tint)', padding: '3px 10px', borderRadius: 999,
                  border: '1px solid rgba(232,68,30,0.2)',
                }}>
                  🎁 {lang === 'es' ? '.com gratis el 1er año' : '.com free 1st year'}
                </span>
              )}
            </div>
          </button>

          {/* Skip */}
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button
              onClick={() => { setDomain(null); router.push('/checkout/addons') }}
              style={{ background: 'transparent', border: 'none', fontSize: 13, color: 'var(--text-3)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {lang === 'es' ? 'Continuar sin dominio' : 'Skip for now'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 32 }}>
          <button
            onClick={() => router.back()}
            style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
          >
            ← {lang === 'es' ? 'Atrás' : 'Back'}
          </button>
        </div>
      </div>
    )
  }

  // ── Existing domain ────────────────────────────────────────────
  if (mode === 'existing') {
    const isConfirmed = selectedDomain?.existing && selectedDomain?.full === existingInput.trim().toLowerCase()
    return (
      <div className="slide-in" style={{ maxWidth: 600, margin: '0 auto' }}>
        <StepHeader
          title={lang === 'es' ? 'Escribe tu dominio' : 'Enter your domain'}
          subtitle={lang === 'es'
            ? 'Ingresa el dominio que ya tienes registrado. Luego te daremos los DNS para que lo apuntes hacia nosotros.'
            : 'Enter the domain you already own. We\'ll give you DNS settings to point it to us.'}
        />

        <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
              <Globe size={16} color="var(--text-3)" />
            </div>
            <input
              type="text"
              value={existingInput}
              onChange={e => { setExistingInput(e.target.value); setExistingError('') }}
              onKeyDown={e => e.key === 'Enter' && handleExistingConfirm()}
              placeholder="minegocio.com"
              style={{
                width: '100%',
                padding: '14px 16px 14px 40px',
                border: `1.5px solid ${existingError ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleExistingConfirm}
            style={{
              padding: '14px 22px',
              background: 'var(--orange)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isConfirmed ? '✓ Listo' : (lang === 'es' ? 'Confirmar' : 'Confirm')}
          </button>
        </div>

        {existingError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>
            <AlertCircle size={14} />
            {existingError}
          </div>
        )}

        {isConfirmed && (
          <div style={{
            background: 'rgba(22,163,74,0.07)', border: '1.5px solid rgba(22,163,74,0.3)',
            borderRadius: 12, padding: '14px 16px', marginTop: 8, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 28, height: 28, background: 'rgba(22,163,74,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={14} color="var(--green)" strokeWidth={3} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', margin: '0 0 2px' }}>{selectedDomain.full}</p>
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                {lang === 'es' ? 'Tras el pago recibirás los DNS para apuntar tu dominio.' : 'After payment you\'ll receive DNS settings to point your domain.'}
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
          <button
            onClick={() => { setMode(null); setDomain(null) }}
            style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
          >
            ← {lang === 'es' ? 'Atrás' : 'Back'}
          </button>
          <button
            disabled={!isConfirmed}
            onClick={() => router.push('/checkout/addons')}
            style={{
              padding: '14px 28px',
              background: isConfirmed ? 'var(--orange)' : 'var(--border)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: isConfirmed ? 'pointer' : 'not-allowed',
            }}
          >
            {lang === 'es' ? 'Continuar' : 'Continue'} →
          </button>
        </div>
      </div>
    )
  }

  // ── Buy domain ─────────────────────────────────────────────────
  return (
    <div className="slide-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Busca tu dominio' : 'Search your domain'}
        subtitle={lang === 'es'
          ? (isKitDigital ? 'El dominio .com es gratis el primer año con tu plan.' : 'Busca el dominio perfecto para tu negocio.')
          : (isKitDigital ? '.com domain is free the first year with your plan.' : 'Find the perfect domain for your business.')}
      />

      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
          <Search size={18} />
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={lang === 'es' ? 'minegocio (sin extensión)' : 'mybusiness (without extension)'}
          style={{
            width: '100%',
            padding: '14px 16px 14px 46px',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--orange)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        {checking && (
          <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
            <span className="spinner spinner-dark" />
          </div>
        )}
      </div>

      {/* TLD results */}
      {hasResults && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TLDS.map(({ tld }) => {
            const available   = results[tld]
            const price       = getDomainPrice(tld)
            const isFree      = price === 0
            const isSelected  = selectedDomain?.full === `${domainName}${tld}` && !selectedDomain?.existing
            const isAvail     = available === true
            const isChecking  = available === undefined && checking

            return (
              <div
                key={tld}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isSelected ? 'var(--orange-tint)' : 'var(--surface)',
                  border: isSelected ? '2px solid var(--orange)' : '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding: '14px 20px',
                  transition: 'border-color 0.15s, background 0.15s',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Globe size={16} color="var(--text-3)" />
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                    {domainName || '—'}<span style={{ color: 'var(--orange)' }}>{tld}</span>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    {isFree
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', background: 'var(--orange-tint)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(232,68,30,0.2)' }}>
                          {lang === 'es' ? 'Gratis 1er año' : 'Free 1st year'}
                        </span>
                      : <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                          {formatPrice(price, currency)}<span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>/año</span>
                        </span>
                    }
                  </div>

                  {isChecking
                    ? <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>...</span>
                    : available === null
                    ? null
                    : <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: isAvail ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                        color: isAvail ? 'var(--green)' : 'var(--red)',
                      }}>
                        {isAvail
                          ? (lang === 'es' ? 'Disponible' : 'Available')
                          : (lang === 'es' ? 'No disponible' : 'Unavailable')}
                      </span>
                  }

                  {isSelected
                    ? <div style={{ width: 32, height: 32, background: 'var(--orange)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={14} color="white" strokeWidth={3} />
                      </div>
                    : <button
                        disabled={!isAvail || !domainName}
                        onClick={() => handleBuySelect(tld)}
                        style={{
                          padding: '7px 16px',
                          background: isAvail && domainName ? 'var(--orange)' : 'var(--border)',
                          color: isAvail && domainName ? 'white' : 'var(--text-3)',
                          border: 'none',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: isAvail && domainName ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                      >
                        {lang === 'es' ? 'Seleccionar' : 'Select'}
                      </button>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!hasResults && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
          <Globe size={40} color="var(--border)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>
            {lang === 'es' ? 'Escribe el nombre de tu dominio para buscar disponibilidad.' : 'Type your domain name to check availability.'}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
        <button
          onClick={() => { setMode(null); setDomain(null) }}
          style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => { setDomain(null); router.push('/checkout/addons') }}
            style={{ padding: '14px 16px', background: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-3)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {lang === 'es' ? 'Continuar sin dominio' : 'Skip domain'}
          </button>
          <button
            disabled={!canContinue || selectedDomain?.existing}
            onClick={() => router.push('/checkout/addons')}
            style={{
              padding: '14px 28px',
              background: canContinue && !selectedDomain?.existing ? 'var(--orange)' : 'var(--border)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: canContinue && !selectedDomain?.existing ? 'pointer' : 'not-allowed',
            }}
          >
            {lang === 'es' ? 'Continuar' : 'Continue'} →
          </button>
        </div>
      </div>
    </div>
  )
}
