'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'
import StepHeader from '@/components/checkout/StepHeader'

export default function ContractPage() {
  const router = useRouter()
  const { lang, currency, plan, addons, hosting, domain, user, getTotal, setSignature, setSignedAt } = useCheckoutStore()
  const tr = useTranslation(lang)

  const canvasRef      = useRef(null)
  const [tab, setTab]  = useState('draw') // 'draw' | 'type'
  const [isDrawing, setIsDrawing]       = useState(false)
  const [typedName, setTypedName]       = useState('')
  const [hasSignature, setHasSignature] = useState(false)
  const [accepted, setAccepted]         = useState(false)
  const [signing, setSigning]           = useState(false)
  const [error, setError]               = useState('')

  const total = getTotal()

  const today = new Date().toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    const ctx = canvas.getContext('2d')
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineWidth   = 2
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }, [])

  function getPos(e, canvas) {
    const rect    = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setHasSignature(false)
  }

  function draw(e) {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function endDraw(e) {
    e.preventDefault()
    if (isDrawing) {
      setIsDrawing(false)
      setHasSignature(true)
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    setTypedName('')
  }

  function handleTypedName(e) {
    const val = e.target.value
    setTypedName(val)
    setHasSignature(val.trim().length > 0)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx  = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (val.trim()) {
      ctx.font         = `italic 32px Georgia, serif`
      ctx.fillStyle    = '#1A1A1A'
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(val, rect.width / 2, rect.height / 2)
    }
  }

  function switchTab(t) {
    setTab(t)
    clearCanvas()
  }

  async function handleSign() {
    setError('')
    if (!hasSignature) {
      setError(lang === 'es' ? 'Por favor dibuja o escribe tu firma.' : 'Please draw or type your signature.')
      return
    }
    if (!accepted) {
      setError(lang === 'es' ? 'Debes aceptar los términos del contrato.' : 'You must accept the contract terms.')
      return
    }
    setSigning(true)
    try {
      const canvas  = canvasRef.current
      const dataUrl = canvas.toDataURL('image/png')
      setSignature(dataUrl)
      const now = new Date().toISOString()
      setSignedAt(now)

      // POST to save contract
      await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:           user?.id,
          signature_data_url: dataUrl,
          signed_at:         now,
          contract_version:  '1.0',
        }),
      })

      router.push('/checkout/payment')
    } catch {
      setError(lang === 'es' ? 'Error al guardar la firma. Intenta de nuevo.' : 'Error saving signature. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  const clientName  = user?.name  || (lang === 'es' ? 'Cliente' : 'Client')
  const clientEmail = user?.email || ''

  const servicesList = [
    plan?.name,
    hosting ? (lang === 'es' ? `Hosting ${hosting.name?.es || hosting.id}` : `Hosting ${hosting.name?.en || hosting.id}`) : null,
    domain  ? (lang === 'es' ? `Dominio: ${domain.full}` : `Domain: ${domain.full}`) : null,
    ...addons.map(a => a.name?.[lang] || a.name?.es || a.id),
  ].filter(Boolean)

  return (
    <div className="slide-in" style={{ maxWidth: 660, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Firma el contrato' : 'Sign the contract'}
        subtitle={lang === 'es' ? 'Lee el contrato y firma para continuar al pago.' : 'Read the contract and sign to proceed to payment.'}
      />

      {/* Contract document */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 28, marginBottom: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
              <span style={{ color: 'var(--orange)' }}>N</span>
              <span style={{ color: 'var(--text)' }}>ithrox</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>hola@nithrox.com · Lima, Perú</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{lang === 'es' ? 'Fecha' : 'Date'}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{today}</div>
          </div>
        </div>

        {/* Parties */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {lang === 'es' ? 'Prestador' : 'Provider'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Nithrox Agency S.A.C.</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>RUC: 20xxxxxxxxx</div>
          </div>
          <div style={{ background: 'rgba(232,68,30,0.06)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {lang === 'es' ? 'Cliente' : 'Client'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{clientName}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{clientEmail}</div>
          </div>
        </div>

        {/* Services */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {lang === 'es' ? 'Servicios contratados' : 'Contracted services'}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {servicesList.map((s, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Total */}
        <div style={{ background: 'var(--text)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>
            {lang === 'es' ? 'Total a pagar' : 'Total amount'}
          </span>
          <span style={{ color: 'var(--orange)', fontSize: 20, fontWeight: 800 }}>{formatPrice(total, currency)}</span>
        </div>

        {/* Contract body */}
        <div style={{
          border: '1.5px solid var(--border)',
          borderRadius: 12,
          padding: '14px 16px',
          maxHeight: 120,
          overflowY: 'auto',
          fontSize: 12,
          color: 'var(--text-2)',
          lineHeight: 1.7,
          marginBottom: 24,
        }}>
          {lang === 'es'
            ? `El presente contrato tiene por objeto establecer los términos y condiciones bajo los cuales Nithrox Agency S.A.C. prestará los servicios digitales acordados al cliente. Los servicios serán ejecutados según los plazos y especificaciones detallados en la propuesta adjunta. El cliente acepta las condiciones de pago, cancelación y uso establecidas en los términos y condiciones de Nithrox. Nithrox se compromete a entregar los servicios con los estándares de calidad acordados. Cualquier modificación al alcance deberá ser comunicada y aceptada por ambas partes. Este contrato es vinculante a partir de la firma del cliente.`
            : `This contract establishes the terms and conditions under which Nithrox Agency S.A.C. will provide the agreed digital services to the client. Services will be executed according to the timelines and specifications detailed in the attached proposal. The client accepts Nithrox's payment, cancellation and usage terms and conditions. Nithrox commits to delivering services to the agreed quality standards. Any scope changes must be communicated and accepted by both parties. This contract is binding upon client signature.`
          }
        </div>

        {/* Signature area */}
        <div>
          {/* Draw / Type tabs */}
          <div style={{ display: 'flex', gap: 0, background: 'var(--surface-2)', borderRadius: 10, padding: 3, marginBottom: 14, width: 'fit-content' }}>
            {[
              { id: 'draw', label: lang === 'es' ? 'Dibujar' : 'Draw' },
              { id: 'type', label: lang === 'es' ? 'Escribir' : 'Type' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                style={{
                  padding: '7px 18px',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: tab === t.id ? 'var(--surface)' : 'transparent',
                  color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
                  boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {lang === 'es' ? 'Tu firma' : 'Your signature'}
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {lang === 'es' ? 'Limpiar' : 'Clear'}
            </button>
          </div>

          <div style={{ position: 'relative', border: '1.5px dashed var(--border)', borderRadius: 12, overflow: 'hidden', background: 'var(--surface-2)' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '140px', display: 'block', touchAction: 'none', cursor: tab === 'draw' ? 'crosshair' : 'text' }}
              onPointerDown={tab === 'draw' ? startDraw : undefined}
              onPointerMove={tab === 'draw' ? draw : undefined}
              onPointerUp={tab === 'draw' ? endDraw : undefined}
              onPointerLeave={tab === 'draw' ? endDraw : undefined}
            />
            {!hasSignature && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  {tab === 'draw'
                    ? (lang === 'es' ? 'Dibuja tu firma aquí' : 'Draw your signature here')
                    : (lang === 'es' ? 'Escribe tu nombre abajo' : 'Type your name below')}
                </span>
              </div>
            )}
          </div>

          {tab === 'type' && (
            <input
              type="text"
              value={typedName}
              onChange={handleTypedName}
              placeholder={clientName}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '11px 14px',
                border: '1.5px solid var(--border)',
                borderRadius: 10,
                fontSize: 18,
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
                color: 'var(--text)',
                background: 'var(--surface)',
                outline: 'none',
              }}
            />
          )}
        </div>
      </div>

      {/* Accept + sign */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 1, accentColor: 'var(--orange)', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {lang === 'es'
              ? <>He leído y acepto el contrato de servicios de Nithrox y sus <a href="/terms" style={{ color: 'var(--orange)', fontWeight: 600 }} target="_blank" rel="noreferrer">términos y condiciones</a>.</>
              : <>I have read and accept Nithrox's service contract and <a href="/terms" style={{ color: 'var(--orange)', fontWeight: 600 }} target="_blank" rel="noreferrer">terms and conditions</a>.</>
            }
          </span>
        </label>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/checkout/review')}
            style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
          >
            ← {lang === 'es' ? 'Atrás' : 'Back'}
          </button>
          <button
            onClick={handleSign}
            disabled={signing}
            style={{
              padding: '14px 28px',
              background: 'var(--orange)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: signing ? 'not-allowed' : 'pointer',
              opacity: signing ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {signing && <span className="spinner" />}
            {signing
              ? (lang === 'es' ? 'Firmando...' : 'Signing...')
              : (lang === 'es' ? '✍️ Firmar y continuar' : '✍️ Sign and continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
