'use client'
import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { Check } from 'lucide-react'
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
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-2)',
              cursor: 'pointer',
            }}
          >
            {currency === 'PEN' ? 'S/' : '$'}
          </button>
          <button
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--text-2)',
              cursor: 'pointer',
            }}
          >
            {lang === 'es' ? 'ES' : 'EN'}
          </button>
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
        </main>

        {/* Order summary sidebar — hidden on thanks page */}
        {showPills && (
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
      {showPills && <MobileBottomBar />}

      <style>{`
        @media (min-width: 1024px) {
          aside { display: block !important; }
        }
      `}</style>
    </div>
  )
}

function MobileBottomBar() {
  const { lang, currency, getTotal } = useCheckoutStore()
  const [open, setOpen] = useState(false)
  const tr = useTranslation(lang)
  const total = getTotal()

  const label = currency === 'USD'
    ? `$${(total / 3.7).toFixed(2)}`
    : `S/ ${total.toLocaleString('es-PE')}`

  return (
    <>
      <div className="lg:hidden" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface)',
        borderTop: '1.5px solid var(--border)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{label}</div>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '10px 20px',
            background: 'var(--surface-2)',
            border: '1.5px solid var(--border)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            color: 'var(--text)',
          }}
        >
          Ver resumen
        </button>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'relative',
            background: 'var(--surface)',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '8px 0 32px',
          }}>
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '8px auto 16px' }} />
            <OrderSummary />
          </div>
        </div>
      )}
    </>
  )
}
