'use client'
import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { Check, PanelRightOpen, PanelRightClose } from 'lucide-react'
import OrderSummary from '@/components/checkout/OrderSummary'
import { useTranslation } from '@/lib/i18n'

const ALL_STEPS = [
  { id: 'plan',      label: { es: 'Plan',       en: 'Plan'      }, path: '/checkout/plan'      },
  { id: 'account',   label: { es: 'Cuenta',     en: 'Account'   }, path: '/checkout/account'   },
  { id: 'customize', label: { es: 'Proyecto',   en: 'Project'   }, path: '/checkout/customize' },
  { id: 'hosting',   label: { es: 'Hosting',    en: 'Hosting'   }, path: '/checkout/hosting'   },
  { id: 'domain',    label: { es: 'Dominio',    en: 'Domain'    }, path: '/checkout/domain'    },
  { id: 'addons',    label: { es: 'Extras',     en: 'Extras'    }, path: '/checkout/addons'    },
  { id: 'review',    label: { es: 'Resumen',    en: 'Review'    }, path: '/checkout/review'    },
  { id: 'contract',  label: { es: 'Contrato',   en: 'Contract'  }, path: '/checkout/contract'  },
  { id: 'payment',   label: { es: 'Pago',       en: 'Payment'   }, path: '/checkout/payment'   },
]

// Thanks page is excluded from steps (no pill)
const HIDDEN_FROM_STEPS = ['/checkout/thanks']

export default function CheckoutLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { lang, setLang, currency, setCurrency, plan } = useCheckoutStore()
  const [summaryOpen, setSummaryOpen] = useState(true)

  // Hide step for Kit Digital (no customize needed)
  const STEPS = ALL_STEPS.filter(s => {
    if (s.id === 'customize') return plan?.customize_step === true
    return true
  })

  // Don't show step pills on thanks page
  const showPills = !HIDDEN_FROM_STEPS.some(p => pathname.startsWith(p))
  const currentIndex = STEPS.findIndex(s => pathname.startsWith(s.path))

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header style={{
        height: 56,
        background: 'var(--surface)',
        borderBottom: '1.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Wordmark */}
        <div
          style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => router.push('/checkout/plan')}
        >
          <span style={{ color: 'var(--orange)' }}>N</span>
          <span style={{ color: 'var(--text)' }}>ithrox</span>
        </div>

        {/* Step pills */}
        {showPills && (
          <nav style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' }}>
            {STEPS.map((step, idx) => {
              const isDone    = idx < currentIndex
              const isCurrent = idx === currentIndex
              return (
                <button
                  key={step.id}
                  onClick={() => isDone && router.push(step.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    border: 'none',
                    cursor: isDone ? 'pointer' : 'default',
                    background: isCurrent
                      ? 'var(--orange)'
                      : isDone
                      ? 'rgba(232,68,30,0.1)'
                      : 'transparent',
                    color: isCurrent
                      ? 'white'
                      : isDone
                      ? 'var(--orange)'
                      : 'var(--text-3)',
                    transition: 'background 0.15s, color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isDone
                    ? <Check size={11} strokeWidth={3} />
                    : <span style={{ fontSize: 11, opacity: 0.7 }}>{idx + 1}</span>
                  }
                  <span className="hidden md:inline">{step.label[lang] || step.label.es}</span>
                </button>
              )
            })}
          </nav>
        )}

        {!showPills && <div style={{ flex: 1 }} />}

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setCurrency(currency === 'PEN' ? 'USD' : 'PEN')}
            style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}
          >
            {currency === 'PEN' ? 'S/' : '$'}
          </button>
          <button
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            style={{ padding: '4px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}
          >
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
          {/* Desktop summary toggle */}
          {showPills && (
            <button
              onClick={() => setSummaryOpen(o => !o)}
              title={summaryOpen ? (lang === 'es' ? 'Ocultar resumen' : 'Hide summary') : (lang === 'es' ? 'Ver resumen' : 'Show summary')}
              className="hidden lg:flex"
              style={{ padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
            >
              {summaryOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
            </button>
          )}
        </div>
      </header>

      {/* ── Two-panel body ───────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'clamp(24px, 5vw, 48px)',
        }}>
          {children}
          {/* Spacer so fixed bottom bar doesn't overlap last element on mobile */}
          {showPills && <div className="lg:hidden" style={{ height: 88 }} />}
        </main>

        {/* Order summary sidebar — hidden on thanks page, toggleable on desktop */}
        {showPills && summaryOpen && (
          <aside style={{
            width: 320,
            flexShrink: 0,
            borderLeft: '1.5px solid var(--border)',
            background: 'var(--surface)',
            overflowY: 'auto',
            display: 'none',
          }}
            className="lg:block"
          >
            <OrderSummary />
          </aside>
        )}
      </div>

      {/* Mobile bottom bar */}
      {showPills && <MobileBottomBar steps={STEPS} currentIndex={currentIndex} />}

      <style>{`
        @media (min-width: 1024px) {
          aside { display: block !important; }
        }
      `}</style>
    </div>
  )
}

function MobileBottomBar({ steps, currentIndex }) {
  const { lang, currency, getTotal, plan } = useCheckoutStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const total = getTotal()
  const isPhased = !!(plan?.payment_schedule)
  const firstPct = plan?.payment_schedule?.[0]?.pct || 100
  const payingNow = isPhased ? Math.round(total * firstPct / 100 * 100) / 100 : total

  const fmt = (n) => currency === 'USD' ? `$${(n / 3.7).toFixed(2)}` : `S/ ${n.toLocaleString('es-PE')}`

  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null
  const nextStep = currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null

  const btnBase = {
    flexShrink: 0, border: '1.5px solid var(--border)', borderRadius: 10,
    background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <>
      <div className="lg:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)', borderTop: '1.5px solid var(--border)',
        padding: '8px 10px', display: 'flex', alignItems: 'center',
        gap: 8, zIndex: 20, minHeight: 62,
      }}>
        {/* Back */}
        <button
          onClick={() => prevStep && router.push(prevStep.path)}
          disabled={!prevStep}
          style={{ ...btnBase, padding: '10px 13px', fontSize: 14, fontWeight: 700, color: 'var(--text-2)', opacity: prevStep ? 1 : 0.3 }}
        >
          ←
        </button>

        {/* Total — tap to open summary */}
        <button
          onClick={() => setOpen(true)}
          style={{ flex: 1, background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 2px', textAlign: 'left' }}
        >
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Total · {lang === 'es' ? 'Ver resumen' : 'Summary'}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{fmt(total)}</div>
          {isPhased && (
            <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Hoy: {fmt(payingNow)}
            </div>
          )}
        </button>

        {/* Continue */}
        {nextStep ? (
          <button
            onClick={() => router.push(nextStep.path)}
            style={{ ...btnBase, padding: '10px 14px', background: 'var(--orange)', border: 'none', fontSize: 13, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}
          >
            {lang === 'es' ? 'Siguiente' : 'Next'} →
          </button>
        ) : (
          <div style={{ width: 48 }} />
        )}
      </div>

      {/* Summary drawer */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)} />
          <div style={{ position: 'relative', background: 'var(--surface)', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '82vh', overflowY: 'auto', padding: '8px 0 32px' }}>
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '8px auto 16px' }} />
            <OrderSummary />
          </div>
        </div>
      )}
    </>
  )
}
