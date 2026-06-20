'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { formatPrice } from '@/lib/data'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Search, Check, Globe } from 'lucide-react'

const TLDS = [
  { tld: '.com', label: '.com', base_price_pen: 0 },
  { tld: '.pe',  label: '.pe',  base_price_pen: 89 },
  { tld: '.net', label: '.net', base_price_pen: 49 },
  { tld: '.org', label: '.org', base_price_pen: 49 },
  { tld: '.store', label: '.store', base_price_pen: 69 },
]

export default function DomainPage() {
  const router = useRouter()
  const { lang, currency, plan, domain: selectedDomain, setDomain } = useCheckoutStore()
  const tr = useTranslation(lang)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState({})
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef(null)

  const isKitDigital = plan?.id === 'kit-digital'

  useEffect(() => {
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
  }, [query])

  function getDomainPrice(tld) {
    // .com is free 1st year for kit-digital
    if (tld === '.com' && isKitDigital) return 0
    return TLDS.find(t => t.tld === tld)?.base_price_pen ?? 49
  }

  function handleSelect(tld) {
    const price = getDomainPrice(tld)
    const name = query.trim().toLowerCase().replace(/\s+/g, '-')
    setDomain({ name, tld, full: `${name}${tld}`, price_pen: price })
  }

  const domainName = query.trim().toLowerCase().replace(/\s+/g, '-')
  const hasResults = query.trim().length > 0

  return (
    <div className="slide-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Elige tu dominio' : 'Choose your domain'}
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
            const isSelected  = selectedDomain?.full === `${domainName}${tld}`
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
                  {/* Price/badge */}
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

                  {/* Availability chip */}
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

                  {/* Select button */}
                  {isSelected
                    ? <div style={{ width: 32, height: 32, background: 'var(--orange)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check size={14} color="white" strokeWidth={3} />
                      </div>
                    : <button
                        disabled={!isAvail || !domainName}
                        onClick={() => handleSelect(tld)}
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
          onClick={() => router.push('/checkout/hosting')}
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
            disabled={!selectedDomain}
            onClick={() => router.push('/checkout/addons')}
            style={{
              padding: '14px 28px',
              background: selectedDomain ? 'var(--orange)' : 'var(--border)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: selectedDomain ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={e => { if (selectedDomain) e.currentTarget.style.background = 'var(--orange-hover)' }}
            onMouseLeave={e => { if (selectedDomain) e.currentTarget.style.background = 'var(--orange)' }}
          >
            {lang === 'es' ? 'Continuar' : 'Continue'} →
          </button>
        </div>
      </div>
    </div>
  )
}
