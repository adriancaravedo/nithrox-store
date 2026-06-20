'use client'
import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import CheckoutProgress from '@/components/shared/CheckoutProgress'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'

export default function ContractPage() {
  const router = useRouter()
  const { lang, currency, plan, addons, hosting, domain, user, setSignature, setSignedAt } = useCheckoutStore()
  const tr = useTranslation(lang)

  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [useTyped, setUseTyped] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  // Resize canvas to its CSS display size on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setUseTyped(false)
    setHasSignature(false)
  }

  function draw(e) {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
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
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    setTypedName('')
    setUseTyped(false)
  }

  function handleTypedNameChange(e) {
    setTypedName(e.target.value)
    setUseTyped(true)
    setHasSignature(e.target.value.trim().length > 0)
    // Render typed name on canvas
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (e.target.value.trim()) {
      ctx.font = `italic 36px 'Georgia', serif`
      ctx.fillStyle = '#111111'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(e.target.value, canvas.width / 2, canvas.height / 2)
    }
  }

  function handleSign() {
    setError('')
    if (!hasSignature) {
      setError(lang === 'es' ? 'Por favor, dibuja o escribe tu firma.' : 'Please draw or type your signature.')
      return
    }
    if (!accepted) {
      setError(lang === 'es' ? 'Debes aceptar los términos.' : 'You must accept the terms.')
      return
    }
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    setSignature(dataUrl)
    setSignedAt(new Date().toISOString())
    router.push('/checkout/payment')
  }

  const clientName = user?.name || (lang === 'es' ? 'Cliente' : 'Client')
  const clientEmail = user?.email || ''
  const servicesList = [
    plan?.name,
    ...(addons.map(a => a.name?.[lang] || a.name?.es || a.id)),
  ].filter(Boolean)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CheckoutProgress current="contract" />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="text-center mb-8 fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ntx-orange)] mb-2">
            {lang === 'es' ? 'Paso final' : 'Final step'}
          </p>
          <h1 className="text-4xl font-black text-[var(--ntx-dark)]">{tr('contract.title')}</h1>
        </div>

        {/* Contract document */}
        <div className="bg-white rounded-[24px] border border-[var(--ntx-border)] p-8 mb-6 fade-up" style={{ animationDelay: '80ms' }}>
          {/* Nithrox header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-[var(--ntx-border)]">
            <div>
              <h2 className="text-xl font-black text-[var(--ntx-dark)]">
                <span className="text-[var(--ntx-orange)]">N</span>ithrox
              </h2>
              <p className="text-xs text-gray-400">hola@nithrox.com · Lima, Perú</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{lang === 'es' ? 'Fecha' : 'Date'}</p>
              <p className="text-sm font-bold text-[var(--ntx-dark)]">{today}</p>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{lang === 'es' ? 'Prestador' : 'Provider'}</p>
              <p className="font-bold text-[var(--ntx-dark)] text-sm">Nithrox Agency S.A.C.</p>
              <p className="text-xs text-gray-500">RUC: 20xxxxxxxxx</p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{lang === 'es' ? 'Cliente' : 'Client'}</p>
              <p className="font-bold text-[var(--ntx-dark)] text-sm">{clientName}</p>
              <p className="text-xs text-gray-500">{clientEmail}</p>
            </div>
          </div>

          {/* Services */}
          <div className="mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              {lang === 'es' ? 'Servicios contratados' : 'Contracted services'}
            </p>
            <ul className="flex flex-col gap-2">
              {servicesList.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[var(--ntx-dark)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ntx-orange)] flex-shrink-0" />
                  {s}
                </li>
              ))}
              {hosting && plan?.id === 'kit-digital' && (
                <li className="flex items-center gap-2 text-sm text-[var(--ntx-dark)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ntx-orange)] flex-shrink-0" />
                  {lang === 'es' ? `Hosting ${hosting.name?.es || hosting.id}` : `Hosting ${hosting.name?.en || hosting.id}`}
                </li>
              )}
              {domain && (
                <li className="flex items-center gap-2 text-sm text-[var(--ntx-dark)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ntx-orange)] flex-shrink-0" />
                  {lang === 'es' ? `Dominio: ${domain.full}` : `Domain: ${domain.full}`}
                </li>
              )}
            </ul>
          </div>

          {/* Total */}
          <div className="bg-[var(--ntx-dark)] rounded-2xl px-5 py-4 flex justify-between items-center mb-6">
            <span className="text-white font-semibold text-sm">{lang === 'es' ? 'Total a pagar' : 'Total amount'}</span>
            <span className="text-[var(--ntx-orange)] font-black text-xl">{formatPrice(plan?.price_pen || 0, currency)}</span>
          </div>

          {/* Contract text */}
          <div className="text-xs text-gray-500 leading-relaxed mb-6 border border-[var(--ntx-border)] rounded-2xl p-4 max-h-32 overflow-y-auto">
            {lang === 'es'
              ? `El presente contrato tiene por objeto establecer los términos y condiciones bajo los cuales Nithrox Agency S.A.C. prestará los servicios digitales acordados al cliente. Los servicios serán ejecutados según los plazos y especificaciones detallados en la propuesta adjunta. El cliente acepta las condiciones de pago, cancelación y uso establecidas en los términos y condiciones de Nithrox. Nithrox se compromete a entregar los servicios con los estándares de calidad acordados. Cualquier modificación al alcance deberá ser comunicada y aceptada por ambas partes. Este contrato es vinculante a partir de la firma del cliente.`
              : `This contract establishes the terms and conditions under which Nithrox Agency S.A.C. will provide the agreed digital services to the client. Services will be executed according to the timelines and specifications detailed in the attached proposal. The client accepts Nithrox's payment, cancellation and usage terms and conditions. Nithrox commits to delivering services to the agreed quality standards. Any scope changes must be communicated and accepted by both parties. This contract is binding upon client signature.`
            }
          </div>

          {/* Signature area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{tr('contract.sign_here')}</p>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors font-semibold"
              >
                🗑 {tr('contract.clear')}
              </button>
            </div>

            <div className="border-2 border-dashed border-[var(--ntx-border)] rounded-2xl overflow-hidden bg-gray-50 relative">
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '140px', display: 'block', touchAction: 'none' }}
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
                className="cursor-crosshair"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-300 text-sm font-medium">{lang === 'es' ? 'Dibuja tu firma aquí' : 'Draw your signature here'}</p>
                </div>
              )}
            </div>

            {/* Type name */}
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1.5">{tr('contract.type_name')}</p>
              <input
                type="text"
                value={typedName}
                onChange={handleTypedNameChange}
                placeholder={clientName}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--ntx-border)] text-sm italic font-serif focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
                style={{ fontFamily: 'Georgia, serif' }}
              />
            </div>
          </div>
        </div>

        {/* Accept + Sign */}
        <div className="bg-white rounded-[24px] border border-[var(--ntx-border)] p-6 fade-up" style={{ animationDelay: '160ms' }}>
          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[var(--ntx-orange)]"
            />
            <span className="text-sm text-gray-600">
              {tr('contract.accept')}{' '}
              <a href="/terms" className="text-[var(--ntx-orange)] underline" target="_blank">
                {lang === 'es' ? 'Términos y condiciones' : 'Terms and conditions'}
              </a>
            </span>
          </label>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              ← {tr('checkout.back')}
            </button>
            <button
              onClick={handleSign}
              className="px-8 py-3.5 bg-[var(--ntx-orange)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all shadow-md shadow-orange-200"
            >
              ✍️ {tr('contract.sign_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
