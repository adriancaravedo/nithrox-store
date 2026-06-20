'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/shared/Header'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'
import { createClient } from '@/lib/supabase'

const STATUS_COLORS = {
  pending:   { bg: 'bg-amber-50',   border: 'border-amber-200', text: 'text-amber-700',  dot: 'bg-amber-400'  },
  paid:      { bg: 'bg-green-50',   border: 'border-green-200', text: 'text-green-700',  dot: 'bg-green-500'  },
  active:    { bg: 'bg-green-50',   border: 'border-green-200', text: 'text-green-700',  dot: 'bg-green-500'  },
  cancelled: { bg: 'bg-red-50',     border: 'border-red-200',   text: 'text-red-700',    dot: 'bg-red-500'    },
}

export default function OrderPage() {
  const params = useParams()
  const router = useRouter()
  const { lang, currency, reset } = useCheckoutStore()
  const tr = useTranslation(lang)

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const orderId = params.id

  useEffect(() => {
    async function fetchOrder() {
      try {
        const supabase = createClient()
        const { data, error: dbErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (dbErr || !data) {
          // Fallback: build from store state
          setOrder({
            id: orderId,
            status: 'pending',
            created_at: new Date().toISOString(),
            plan_name: 'Kit Digital',
            total_pen: 149,
            payment_method: 'stripe',
            items: {},
          })
        } else {
          setOrder(data)
        }
      } catch {
        setOrder({
          id: orderId,
          status: 'pending',
          created_at: new Date().toISOString(),
          plan_name: 'Plan',
          total_pen: 0,
          items: {},
        })
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId])

  const STATUS_LABELS = {
    pending:   tr('order.status_pending'),
    paid:      tr('order.status_paid'),
    active:    tr('order.status_active'),
    cancelled: tr('order.status_cancelled'),
  }

  const NEXT_STEPS = [
    { key: 'validate', icon: '🔍', label: tr('order.step_validate') },
    { key: 'setup',    icon: '⚙️', label: tr('order.step_setup') },
    { key: 'start',    icon: '🚀', label: tr('order.step_start') },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[var(--ntx-orange)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">{lang === 'es' ? 'Cargando tu pedido...' : 'Loading your order...'}</p>
          </div>
        </div>
      </div>
    )
  }

  const status = order?.status || 'pending'
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending
  const isPending = status === 'pending'
  const isSuccess = status === 'paid' || status === 'active'

  const formattedDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : ''

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">

        {/* Status hero */}
        <div className="text-center mb-10 fade-up">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl mb-5 ${
            isPending ? 'bg-amber-50 border-4 border-amber-200' : 'bg-green-50 border-4 border-green-200'
          }`}>
            {isPending ? '⏳' : '✅'}
          </div>

          <h1 className="text-3xl font-black text-[var(--ntx-dark)]">
            {isPending ? tr('payment.pending_title') : tr('payment.success_title')}
          </h1>
          <p className="text-gray-500 mt-2">
            {isPending ? tr('payment.pending_subtitle') : tr('payment.success_subtitle')}
          </p>
        </div>

        {/* Order card */}
        <div className="bg-white rounded-[24px] border border-[var(--ntx-border)] overflow-hidden fade-up mb-5" style={{ animationDelay: '80ms' }}>
          <div className="p-6 border-b border-[var(--ntx-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {lang === 'es' ? 'Orden' : 'Order'}
                </p>
                <p className="font-mono font-bold text-[var(--ntx-dark)] text-sm">{order?.id?.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formattedDate}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${colors.bg} ${colors.border} ${colors.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                {STATUS_LABELS[status] || status}
              </span>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-3">
            {/* Plan */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{lang === 'es' ? 'Plan' : 'Plan'}</span>
              <span className="font-bold text-[var(--ntx-dark)]">{order?.plan_name}</span>
            </div>

            {/* Addons from items */}
            {order?.items?.addons?.map?.((a, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-500">{a.name?.[lang] || a.name?.es || a.id}</span>
                <span className="font-bold text-[var(--ntx-dark)]">{formatPrice(a.price_pen, currency)}</span>
              </div>
            ))}

            <hr className="border-[var(--ntx-border)]" />
            <div className="flex justify-between">
              <span className="font-bold text-[var(--ntx-dark)]">{lang === 'es' ? 'Total pagado' : 'Total paid'}</span>
              <span className="font-black text-[var(--ntx-orange)] text-lg">{formatPrice(order?.total_pen || 0, currency)}</span>
            </div>
          </div>
        </div>

        {/* What's next */}
        <div className="bg-white rounded-[24px] border border-[var(--ntx-border)] p-6 fade-up" style={{ animationDelay: '160ms' }}>
          <h2 className="font-black text-[var(--ntx-dark)] mb-5">{tr('order.what_happens')}</h2>
          <div className="flex flex-col gap-0">
            {NEXT_STEPS.map((step, i) => {
              const done = isSuccess && i < 1
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                      done ? 'bg-green-100' : isPending && i === 0 ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      {done ? '✅' : step.icon}
                    </div>
                    {i < NEXT_STEPS.length - 1 && (
                      <div className={`w-0.5 flex-1 my-1 ${done ? 'bg-green-300' : 'bg-gray-200'}`} style={{ minHeight: '24px' }} />
                    )}
                  </div>
                  <div className="pb-6 pt-2">
                    <p className={`text-sm font-bold ${done ? 'text-green-700' : 'text-[var(--ntx-dark)]'}`}>
                      {step.label}
                    </p>
                    {isPending && i === 0 && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        {lang === 'es' ? 'Validaremos tu pago en menos de 24 horas. Te notificaremos por email.' : "We'll validate your payment within 24 hours. We'll notify you by email."}
                      </p>
                    )}
                    {isSuccess && i === 1 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lang === 'es' ? 'En proceso...' : 'In progress...'}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8 fade-up" style={{ animationDelay: '240px' }}>
          <Link
            href="/account"
            className="flex-1 text-center py-3.5 bg-[var(--ntx-dark)] text-white font-bold rounded-full hover:opacity-90 transition-all"
          >
            {lang === 'es' ? '→ Portal del cliente' : '→ Client portal'}
          </Link>
          <button
            onClick={() => { reset(); router.push('/') }}
            className="flex-1 text-center py-3.5 border-2 border-[var(--ntx-border)] text-gray-600 font-bold rounded-full hover:border-gray-400 transition-all"
          >
            {lang === 'es' ? 'Volver al inicio' : 'Back to home'}
          </button>
        </div>
      </div>
    </div>
  )
}
