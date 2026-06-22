'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import StepHeader from '@/components/checkout/StepHeader'
import { formatPrice } from '@/lib/data'
import { FileText, Layers, Clock, ChevronRight, Check, Tag } from 'lucide-react'

const FEATURES_OPTIONS = {
  es: [
    { id: 'blog',       label: 'Blog / Noticias',          icon: '📝' },
    { id: 'gallery',    label: 'Galería de imágenes',       icon: '🖼️' },
    { id: 'chat',       label: 'Chat en vivo',              icon: '💬' },
    { id: 'forms',      label: 'Formularios avanzados',     icon: '📋' },
    { id: 'api',        label: 'Integraciones API',         icon: '🔌' },
    { id: 'multilang',  label: 'Multi-idioma',              icon: '🌐' },
    { id: 'booking',    label: 'Sistema de reservas',       icon: '📅' },
    { id: 'members',    label: 'Área de miembros',          icon: '🔐' },
  ],
  en: [
    { id: 'blog',       label: 'Blog / News',               icon: '📝' },
    { id: 'gallery',    label: 'Image gallery',             icon: '🖼️' },
    { id: 'chat',       label: 'Live chat',                 icon: '💬' },
    { id: 'forms',      label: 'Advanced forms',            icon: '📋' },
    { id: 'api',        label: 'API integrations',          icon: '🔌' },
    { id: 'multilang',  label: 'Multi-language',            icon: '🌐' },
    { id: 'booking',    label: 'Booking system',            icon: '📅' },
    { id: 'members',    label: 'Members area',              icon: '🔐' },
  ],
}

const TIMELINE_OPTIONS = {
  es: [
    { id: 'asap',     label: 'Lo antes posible',    desc: 'Inicio inmediato' },
    { id: '2weeks',   label: '1–2 semanas',          desc: 'Tiempo estándar' },
    { id: '1month',   label: '3–4 semanas',          desc: 'Con revisiones' },
    { id: 'flexible', label: 'Flexible',             desc: 'Sin fecha límite' },
  ],
  en: [
    { id: 'asap',     label: 'As soon as possible', desc: 'Immediate start' },
    { id: '2weeks',   label: '1–2 weeks',           desc: 'Standard time' },
    { id: '1month',   label: '3–4 weeks',           desc: 'With revisions' },
    { id: 'flexible', label: 'Flexible',            desc: 'No deadline' },
  ],
}

export default function CustomizePage() {
  const router = useRouter()
  const { lang, currency, plan, customization, setCustomization } = useCheckoutStore()


  // Redirect if plan doesn't need customize step
  useEffect(() => {
    if (!plan) { router.push('/checkout/plan'); return }
    if (!plan.customize_step) { router.push('/checkout/hosting'); return }
  }, [plan])

  const pageOpts = plan?.page_options || []

  const [selectedPages, setSelectedPages] = useState(customization?.pages || pageOpts[0]?.value || null)
  const [pagesExtra, setPagesExtra] = useState(customization?.pagesExtra || 0)
  const [selectedFeatures, setSelectedFeatures] = useState(customization?.features || [])
  const [selectedTimeline, setSelectedTimeline] = useState(customization?.timeline || null)
  const [notes, setNotes] = useState(customization?.notes || '')

  const featureOpts = FEATURES_OPTIONS[lang] || FEATURES_OPTIONS.es
  const timelineOpts = TIMELINE_OPTIONS[lang] || TIMELINE_OPTIONS.es

  // Live price
  const basePrice = plan?.price_pen || 0
  const currentTotal = basePrice + pagesExtra
  const isPhased = !!(plan?.payment_schedule)
  const firstPaymentPct = plan?.payment_schedule?.[0]?.pct || 100
  const payingNow = isPhased ? Math.round(currentTotal * firstPaymentPct / 100 * 100) / 100 : currentTotal

  function toggleFeature(id) {
    setSelectedFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  function handlePageSelect(opt) {
    setSelectedPages(opt.value)
    setPagesExtra(opt.price_extra_pen || 0)
  }

  function handleContinue() {
    setCustomization({
      pages: selectedPages,
      pagesExtra,
      features: selectedFeatures,
      timeline: selectedTimeline,
    })
    router.push('/checkout/hosting')
  }

  const canContinue = selectedPages && selectedTimeline

  const cardBase = {
    border: '1.5px solid var(--border)',
    borderRadius: 12,
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: 'var(--surface)',
  }

  if (!plan) return null

  return (
    <div className="slide-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Personaliza tu proyecto' : 'Personalize your project'}
        subtitle={lang === 'es'
          ? `Cuéntanos qué necesitas para tu ${plan.name}. Más detalles = mejor resultado.`
          : `Tell us what you need for your ${plan.name}. More details = better results.`}
      />

      {/* Live price card */}
      <div style={{
        background: 'var(--orange-tint)',
        border: '1.5px solid rgba(232,68,30,0.25)',
        borderRadius: 14,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag size={14} color="var(--orange)" />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {lang === 'es' ? 'Precio final' : 'Final price'}
            </div>
            {pagesExtra > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                {formatPrice(basePrice, currency)} + {formatPrice(pagesExtra, currency)} {lang === 'es' ? '(páginas extra)' : '(extra pages)'}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--orange)', letterSpacing: '-0.02em' }}>
            {formatPrice(currentTotal, currency)}
          </div>
          {isPhased && (
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 600 }}>
              {lang === 'es' ? `Pagas hoy: ${formatPrice(payingNow, currency)} (${firstPaymentPct}%)` : `Pay today: ${formatPrice(payingNow, currency)} (${firstPaymentPct}%)`}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Section 1: Number of pages */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <SectionTitle icon={<FileText size={14} />} title={lang === 'es' ? '¿Cuántas páginas necesitas?' : 'How many pages do you need?'} />
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {pageOpts.map(opt => {
              const isActive = selectedPages === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => handlePageSelect(opt)}
                  style={{
                    ...cardBase,
                    background: isActive ? 'var(--orange-tint)' : 'var(--surface)',
                    borderColor: isActive ? 'var(--orange)' : 'var(--border)',
                    boxShadow: isActive ? '0 0 0 3px rgba(232,68,30,0.1)' : 'none',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{opt.label}</div>
                    {opt.price_extra_pen > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--orange)', fontWeight: 600, marginTop: 2 }}>
                        +{formatPrice(opt.price_extra_pen, currency)}
                      </div>
                    )}
                    {opt.price_extra_pen === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>
                        {lang === 'es' ? 'Incluido' : 'Included'}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} color="white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 2: Features */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <SectionTitle icon={<Layers size={14} />} title={lang === 'es' ? '¿Qué funcionalidades necesitas?' : 'What features do you need?'} subtitle={lang === 'es' ? 'Selecciona todas las que apliquen' : 'Select all that apply'} />
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {featureOpts.map(f => {
              const isActive = selectedFeatures.includes(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFeature(f.id)}
                  style={{
                    ...cardBase,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: isActive ? 'rgba(232,68,30,0.06)' : 'var(--surface)',
                    borderColor: isActive ? 'rgba(232,68,30,0.3)' : 'var(--border)',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text)' : 'var(--text-2)', textAlign: 'left', flex: 1 }}>
                    {f.label}
                  </span>
                  {isActive && <Check size={13} color="var(--orange)" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Section 3: Timeline */}
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <SectionTitle icon={<Clock size={14} />} title={lang === 'es' ? '¿Cuándo necesitas el proyecto?' : 'When do you need the project?'} />
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {timelineOpts.map(t => {
              const isActive = selectedTimeline === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTimeline(t.id)}
                  style={{
                    ...cardBase,
                    textAlign: 'left',
                    background: isActive ? 'var(--orange-tint)' : 'var(--surface)',
                    borderColor: isActive ? 'var(--orange)' : 'var(--border)',
                    boxShadow: isActive ? '0 0 0 3px rgba(232,68,30,0.1)' : 'none',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{t.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.desc}</div>
                </button>
              )
            })}
          </div>
        </div>

      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
        <button
          onClick={() => router.push('/checkout/account')}
          style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>
        <button
          disabled={!canContinue}
          onClick={handleContinue}
          style={{
            padding: '14px 28px',
            background: canContinue ? 'var(--orange)' : 'var(--border)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          onMouseEnter={e => { if (canContinue) e.currentTarget.style.background = 'var(--orange-hover)' }}
          onMouseLeave={e => { if (canContinue) e.currentTarget.style.background = 'var(--orange)' }}
        >
          {lang === 'es' ? 'Configurar hosting' : 'Configure hosting'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ color: 'var(--orange)', marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
    </div>
  )
}
