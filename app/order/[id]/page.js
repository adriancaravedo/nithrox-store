'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'
import { createClient } from '@/lib/supabase'

export default function OrderPage() {
  const params        = useParams()
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const { lang, currency, reset } = useCheckoutStore()
  const tr            = useTranslation(lang)

  const [order, setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)

  const orderId = params.id
  const method  = searchParams.get('method')

  useEffect(() => {
    async function fetchOrder() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        setOrder(data || buildFallback(orderId))
      } catch {
        setOrder(buildFallback(orderId))
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p style={{ marginTop: 16, color: 'var(--text-2)', fontSize: 14 }}>
            {lang === 'es' ? 'Cargando tu pedido...' : 'Loading your order...'}
          </p>
        </div>
      </div>
    )
  }

  const status    = order?.status || 'pending'
  const isPending = status === 'pending'
  const isSuccess = status === 'paid' || status === 'active'
  const isTransfer = method === 'transfer' || order?.payment_method === 'transfer'

  const formattedDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : ''

  const orderRef = order?.id
    ? `NTX-${order.id.slice(0, 8).toUpperCase()}`
    : `NTX-${orderId?.slice(0, 8).toUpperCase()}`

  const NEXT_STEPS = [
    {
      key: 'validate',
      label: lang === 'es' ? 'Validamos tu pago' : 'We validate your payment',
      sub: isPending
        ? (lang === 'es' ? 'Te notificaremos en menos de 24 h.' : "We'll notify you within 24 hours.")
        : (lang === 'es' ? 'Pago confirmado.' : 'Payment confirmed.'),
      done: isSuccess,
      active: isPending,
    },
    {
      key: 'setup',
      label: lang === 'es' ? 'Configuramos tu hosting y dominio' : 'We set up your hosting and domain',
      sub: isSuccess ? (lang === 'es' ? 'En proceso...' : 'In progress...') : '',
      done: false,
      active: isSuccess,
    },
    {
      key: 'start',
      label: lang === 'es' ? 'Empezamos a trabajar' : "We start working",
      sub: '',
      done: false,
      active: false,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 'clamp(24px, 5vw, 48px)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Hero */}
        <div className="fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* Animated checkmark or clock */}
          {isSuccess ? (
            <div style={{ width: 80, height: 80, margin: '0 auto 20px' }}>
              <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="38" stroke="#16A34A" strokeWidth="3" strokeDasharray="283" strokeDashoffset="0"
                  style={{ animation: 'drawCircle 0.6s ease forwards' }} />
                <polyline points="22,40 34,52 58,28" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="80" strokeDashoffset="0"
                  style={{ animation: 'drawCheck 0.4s 0.5s ease forwards' }} />
              </svg>
            </div>
          ) : (
            <div style={{
              width: 80, height: 80, margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'rgba(245,158,11,0.1)',
              border: '3px solid rgba(245,158,11,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>
              ⏳
            </div>
          )}

          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
            {isPending
              ? (lang === 'es' ? `¡Pedido ${orderRef} recibido!` : `Order ${orderRef} received!`)
              : (lang === 'es' ? `¡Pago confirmado!` : 'Payment confirmed!')}
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 8 }}>
            {isPending
              ? (lang === 'es' ? 'Validaremos tu pago y te avisamos por email.' : "We'll validate your payment and email you.")
              : (lang === 'es' ? 'Tu pedido está siendo procesado.' : 'Your order is being processed.')}
          </p>
        </div>

        {/* Transfer reminder */}
        {isTransfer && isPending && (
          <div className="fade-up" style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1.5px solid rgba(245,158,11,0.3)',
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 16,
            fontSize: 13,
            color: '#92400E',
            fontWeight: 500,
          }}>
            📋 {lang === 'es'
              ? 'Si aún no has subido tu comprobante, hazlo lo antes posible para acelerar la validación.'
              : "If you haven't uploaded your receipt yet, please do so as soon as possible to speed up validation."}
          </div>
        )}

        {/* Order card */}
        <div className="fade-up" style={{ animationDelay: '80ms', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {lang === 'es' ? 'Número de pedido' : 'Order number'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)', marginTop: 2 }}>{orderRef}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{formattedDate}</div>
            </div>
            <StatusBadge status={status} lang={lang} tr={tr} />
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {order?.plan_name && (
              <OrderRow label={lang === 'es' ? 'Plan' : 'Plan'} value={order.plan_name} />
            )}
            {order?.items?.hosting && (
              <OrderRow label="Hosting" value={order.items.hosting?.name?.es || order.items.hosting?.id || 'Hosting'} />
            )}
            {order?.items?.domain && (
              <OrderRow label={lang === 'es' ? 'Dominio' : 'Domain'} value={order.items.domain?.full || ''} />
            )}
            {order?.items?.addons?.map?.((a, i) => (
              <OrderRow key={i} label={a.name?.[lang] || a.name?.es || a.id} value={formatPrice(a.price_pen, currency)} />
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {lang === 'es' ? 'Total pagado' : 'Total paid'}
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>
                {formatPrice(order?.total_pen || 0, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* What's next timeline */}
        <div className="fade-up" style={{ animationDelay: '160ms', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
            {lang === 'es' ? '¿Qué sigue?' : "What's next?"}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {NEXT_STEPS.map((step, i) => (
              <div key={step.key} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: '50%',
                    background: step.done ? 'rgba(22,163,74,0.12)' : step.active ? 'rgba(232,68,30,0.12)' : 'var(--surface-2)',
                    border: `2px solid ${step.done ? 'var(--green)' : step.active ? 'var(--orange)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 14,
                  }}>
                    {step.done ? '✓' : step.active ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)', animation: 'pulse 1.5s infinite' }} /> : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)' }}>{i + 1}</span>}
                  </div>
                  {i < NEXT_STEPS.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: step.done ? 'var(--green)' : 'var(--border)', minHeight: 24, margin: '4px 0' }} />
                  )}
                </div>
                <div style={{ paddingBottom: 20, paddingTop: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: step.done ? 'var(--green)' : step.active ? 'var(--text)' : 'var(--text-3)' }}>
                    {step.label}
                  </div>
                  {step.sub && (
                    <div style={{ fontSize: 12, color: step.active && !step.done ? 'rgba(245,158,11,0.9)' : 'var(--text-3)', marginTop: 3 }}>
                      {step.sub}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12 }} className="fade-up">
          <a
            href="https://app.nithrox.com/portal"
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'var(--orange)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              textAlign: 'center',
              textDecoration: 'none',
              display: 'block',
            }}
          >
            {lang === 'es' ? 'Ir al portal del cliente →' : 'Go to client portal →'}
          </a>
          <button
            onClick={() => { reset(); router.push('/checkout/plan') }}
            style={{
              flex: 1,
              padding: '14px 20px',
              background: 'transparent',
              border: '1.5px solid var(--border)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--text-2)',
            }}
          >
            {lang === 'es' ? 'Volver al inicio' : 'Back to home'}
          </button>
        </div>
      </div>
    </div>
  )
}

function buildFallback(id) {
  return {
    id,
    status: 'pending',
    created_at: new Date().toISOString(),
    plan_name: null,
    total_pen: 0,
    payment_method: null,
    items: {},
  }
}

function StatusBadge({ status, lang, tr }) {
  const configs = {
    pending:   { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  color: '#92400E', dot: '#F59E0B',  label: lang === 'es' ? 'Pendiente' : 'Pending' },
    paid:      { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',   color: '#14532D', dot: '#16A34A',  label: lang === 'es' ? 'Pagado' : 'Paid' },
    active:    { bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)',   color: '#14532D', dot: '#16A34A',  label: lang === 'es' ? 'Activo' : 'Active' },
    cancelled: { bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.3)',   color: '#7F1D1D', dot: '#DC2626',  label: lang === 'es' ? 'Cancelado' : 'Cancelled' },
  }
  const cfg = configs[status] || configs.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px',
      borderRadius: 999,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      fontSize: 11,
      fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function OrderRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--text-2)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}
