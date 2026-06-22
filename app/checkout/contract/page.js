'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { formatPrice, getFirstPaymentAmount } from '@/lib/data'
import StepHeader from '@/components/checkout/StepHeader'
import {
  Shield, Pen, Type, Check,
  AlertCircle, Lock, CalendarDays, Hash
} from 'lucide-react'

function generateContractNumber() {
  const year = new Date().getFullYear()
  const rnd  = Math.floor(100000 + Math.random() * 900000)
  return `NTX-${year}-${rnd}`
}

async function fetchClientIp() {
  try {
    const r = await fetch('/api/auth/client-ip')
    const d = await r.json()
    return d.ip || 'N/A'
  } catch {
    return 'N/A'
  }
}

function billingLabel(billing, lang) {
  if (billing === 'month') return lang === 'es' ? '/mes' : '/mo'
  if (billing === 'year')  return lang === 'es' ? '/año' : '/yr'
  return lang === 'es' ? 'pago único' : 'one-time'
}

export default function ContractPage() {
  const router = useRouter()
  const {
    lang, currency, plan, addons, hosting, domain, customization, user,
    getTotal, getFirstPayment,
    setSignature, setSignedAt,
    signerFullName, setSignerFullName,
    signerDni, setSignerDni,
    contractNumber, setContractNumber,
    signerIp, setSignerIp,
  } = useCheckoutStore()

  const canvasRef = useRef(null)
  const [tab, setTab]             = useState('draw')
  const [isDrawing, setIsDrawing] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [hasSignature, setHasSignature] = useState(false)
  const [accepted, setAccepted]   = useState(false)
  const [signing, setSigning]     = useState(false)
  const [error, setError]         = useState('')
  const [ip, setIp]               = useState(signerIp || '')

  const total        = getTotal()
  const firstPayment = getFirstPayment ? getFirstPayment() : total
  const isPhased     = !!(plan?.payment_schedule)
  const contractNum  = contractNumber || generateContractNumber()

  const today = new Date().toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Init contract number and IP
  useEffect(() => {
    if (!contractNumber) setContractNumber(contractNum)
    if (!signerIp) {
      fetchClientIp().then(fetchedIp => {
        setIp(fetchedIp)
        setSignerIp(fetchedIp)
      })
    }
    // Prefill name from user
    if (!signerFullName && user?.name) setSignerFullName(user.name)
  }, [])

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    initCanvas(canvas)
  }, [])

  function initCanvas(canvas) {
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    const ctx = canvas.getContext('2d')
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.strokeStyle = '#1A1A1A'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
  }

  function getPos(e, canvas) {
    const rect    = canvas.getBoundingClientRect()
    const touch   = e.touches ? e.touches[0] : null
    const clientX = touch ? touch.clientX : e.clientX
    const clientY = touch ? touch.clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDraw = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setHasSignature(false)
  }, [])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing])

  const endDraw = useCallback((e) => {
    e.preventDefault()
    if (isDrawing) {
      setIsDrawing(false)
      setHasSignature(true)
    }
  }, [isDrawing])

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
    setHasSignature(val.trim().length > 2)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx  = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (val.trim()) {
      ctx.font         = 'italic 36px Georgia, serif'
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

  async function handleDownloadPDF() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const margin = 20
    const pageW  = 210
    const contentW = pageW - margin * 2
    let y = margin

    const addText = (text, size = 10, style = 'normal', color = [26, 26, 26]) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', style)
      doc.setTextColor(...color)
      const lines = doc.splitTextToSize(text, contentW)
      doc.text(lines, margin, y)
      y += lines.length * (size * 0.45) + 2
    }

    const addRule = (color = [229, 227, 220]) => {
      doc.setDrawColor(...color)
      doc.line(margin, y, pageW - margin, y)
      y += 4
    }

    // Header
    doc.setFillColor(232, 68, 30)
    doc.rect(margin, y, 4, 18, 'F')
    addText('CONTRATO DE SERVICIOS DIGITALES', 16, 'bold', [26, 26, 26])
    y -= 4
    addText(`Nithrox Agency S.A.C.`, 9, 'normal', [107, 105, 99])
    y += 2; addRule()

    addText(`N° de Contrato: ${contractNum}`, 9, 'bold', [107, 105, 99])
    addText(`Fecha: ${today}`, 9, 'normal', [107, 105, 99])
    y += 4; addRule()

    // Parties
    addText('PARTES', 11, 'bold')
    y += 2
    addText('PRESTADOR: Nithrox Agency S.A.C. · RUC: 20xxxxxxxxx · Lima, Perú', 9)
    addText(`CLIENTE: ${signerFullName || user?.name || 'N/A'} · DNI/Pasaporte: ${signerDni || 'N/A'}`, 9)
    addText(`Correo electrónico: ${user?.email || 'N/A'}`, 9)
    y += 4; addRule()

    // Services
    addText('SERVICIOS CONTRATADOS', 11, 'bold')
    y += 2
    if (plan) {
      const bl = plan.billing_label?.[lang] || ''
      addText(`• ${plan.name} — ${formatPrice(plan.price_pen, 'PEN')} (${bl})`, 9)
    }
    if (hosting) addText(`• Hosting ${hosting.name?.es || hosting.id} — ${hosting.price_pen === 0 ? 'Incluido' : formatPrice(hosting.price_pen, 'PEN')}`, 9)
    if (domain)  addText(`• Dominio ${domain.full} — ${domain.price_pen === 0 ? 'Gratis 1er año' : formatPrice(domain.price_pen, 'PEN')}`, 9)
    addons.forEach(a => addText(`• ${a.name?.es || a.id} — ${formatPrice(a.price_pen, 'PEN')} ${billingLabel(a.billing, 'es')}`, 9))
    y += 4; addRule()

    // Payment
    addText('CONDICIONES DE PAGO', 11, 'bold')
    y += 2
    if (isPhased && plan.payment_schedule) {
      plan.payment_schedule.forEach(ph => {
        const amount = Math.round(total * ph.pct / 100 * 100) / 100
        addText(`• Fase ${ph.phase} — ${ph.label?.es}: ${ph.pct}% = ${formatPrice(amount, 'PEN')}`, 9)
      })
    } else {
      addText(`• Pago único: ${formatPrice(total, 'PEN')}`, 9)
    }
    addText(`TOTAL: ${formatPrice(total, 'PEN')}`, 10, 'bold', [232, 68, 30])
    y += 4; addRule()

    // Legal text
    addText('TÉRMINOS Y CONDICIONES', 11, 'bold')
    y += 2
    const legalText = `1. OBJETO. El presente contrato tiene por objeto establecer los términos y condiciones bajo los cuales Nithrox Agency S.A.C. prestará los servicios digitales detallados en la sección anterior.

2. OBLIGACIONES DE NITHROX. Nithrox se compromete a ejecutar los servicios contratados con los más altos estándares de calidad, dentro de los plazos acordados, y a mantener comunicación constante con el cliente sobre el avance del proyecto.

3. OBLIGACIONES DEL CLIENTE. El cliente se compromete a proporcionar la información, contenidos y materiales necesarios para el desarrollo del proyecto, así como a realizar los pagos en los plazos establecidos. El incumplimiento del pago en la fase correspondiente podrá suspender el desarrollo del proyecto.

4. PROPIEDAD INTELECTUAL. Una vez realizados todos los pagos, el cliente adquiere los derechos de uso sobre el resultado del proyecto. Nithrox conserva los derechos de autoría del código y diseño base.

5. CONFIDENCIALIDAD. Ambas partes se comprometen a mantener confidencial toda información sensible intercambiada durante la vigencia del contrato.

6. RESOLUCIÓN DE CONFLICTOS. Cualquier controversia derivada del presente contrato será resuelta conforme a la legislación peruana vigente, con jurisdicción en los tribunales de Lima, Perú.

7. FIRMA DIGITAL. La firma digital del cliente tiene la misma validez legal que una firma manuscrita, conforme a la Ley N° 27269 de Firmas y Certificados Digitales del Perú.`
    addText(legalText, 8, 'normal', [107, 105, 99])
    y += 4; addRule()

    // Signature
    addText('FIRMA DEL CLIENTE', 11, 'bold')
    y += 2
    addText(`Nombre completo: ${signerFullName || 'N/A'}`, 9)
    addText(`DNI / Pasaporte: ${signerDni || 'N/A'}`, 9)
    addText(`Fecha y hora: ${new Date().toISOString()}`, 9)
    addText(`IP del firmante: ${ip || 'N/A'}`, 9)

    // Embed signature image
    if (canvasRef.current) {
      try {
        const sigDataUrl = canvasRef.current.toDataURL('image/png')
        doc.addImage(sigDataUrl, 'PNG', margin, y + 2, 60, 20)
        y += 28
      } catch {}
    }

    y += 8
    addText(`_`.repeat(40), 9, 'normal', [229, 227, 220])
    addText(`${signerFullName || 'Cliente'}`, 9, 'bold')
    y += 6
    addText(`Verificado digitalmente · ${contractNum}`, 8, 'normal', [168, 164, 158])

    doc.save(`Contrato-${contractNum}.pdf`)
  }

  async function handleSign() {
    setError('')
    if (!signerFullName || signerFullName.trim().length < 3) {
      setError(lang === 'es' ? 'Por favor ingresa tu nombre completo (mínimo 3 caracteres).' : 'Please enter your full name (minimum 3 characters).')
      return
    }
    if (!signerDni || signerDni.trim().length < 6) {
      setError(lang === 'es' ? 'Por favor ingresa tu DNI o número de pasaporte.' : 'Please enter your DNI or passport number.')
      return
    }
    if (!hasSignature) {
      setError(lang === 'es' ? 'Por favor dibuja o escribe tu firma en el panel.' : 'Please draw or type your signature in the panel.')
      return
    }
    if (!accepted) {
      setError(lang === 'es' ? 'Debes leer y aceptar los términos del contrato.' : 'You must read and accept the contract terms.')
      return
    }

    setSigning(true)
    try {
      const canvas  = canvasRef.current
      const dataUrl = canvas.toDataURL('image/png')
      setSignature(dataUrl)
      const now = new Date().toISOString()
      setSignedAt(now)

      await fetch('/api/contracts/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:            user?.id,
          signature_data_url: dataUrl,
          signed_at:          now,
          contract_version:   '2.0',
          contract_number:    contractNum,
          signer_name:        signerFullName,
          signer_dni:         signerDni,
          signer_ip:          ip,
        }),
      })

      router.push('/checkout/payment')
    } catch {
      setError(lang === 'es' ? 'Error al guardar la firma. Intenta de nuevo.' : 'Error saving signature. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  const servicesList = [
    plan ? { name: plan.name, price: plan.price_pen, detail: plan.billing_label?.[lang] || '' } : null,
    hosting ? { name: `Hosting ${hosting.name?.[lang] || hosting.name?.es || hosting.id}`, price: hosting.price_pen, detail: hosting.price_pen === 0 ? (lang === 'es' ? 'Incluido' : 'Included') : null } : null,
    domain  ? { name: `Dominio ${domain.full}`, price: domain.price_pen || 0, detail: lang === 'es' ? 'Gratis 1er año' : 'Free 1st year' } : null,
    ...addons.map(a => ({ name: a.name?.[lang] || a.name?.es || a.id, price: a.price_pen, detail: billingLabel(a.billing, lang) })),
  ].filter(Boolean)

  return (
    <div className="slide-in" style={{ maxWidth: 740, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Contrato de servicios' : 'Service contract'}
        subtitle={lang === 'es' ? 'Lee el contrato y firma para continuar al pago.' : 'Read the contract and sign to proceed to payment.'}
      />

      {/* ── CONTRACT DOCUMENT ─────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Contract header bar */}
        <div style={{
          background: 'var(--text)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>
              <span style={{ color: 'var(--orange)' }}>N</span>ithrox
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 400, marginLeft: 12 }}>
                {lang === 'es' ? 'Contrato de Servicios Digitales' : 'Digital Services Contract'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>hola@nithrox.com · Lima, Perú</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginBottom: 3 }}>
              <Hash size={10} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{contractNum}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
              <CalendarDays size={10} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{today}</span>
            </div>
          </div>
        </div>

        {/* Contract body */}
        <div style={{ padding: '24px 28px' }}>

          {/* Parties */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <PartyCard
              role={lang === 'es' ? 'PRESTADOR' : 'PROVIDER'}
              name="Nithrox Agency S.A.C."
              detail="RUC: 20xxxxxxxxx"
              detail2="Lima, Perú"
              color="var(--surface-2)"
            />
            <PartyCard
              role={lang === 'es' ? 'CLIENTE' : 'CLIENT'}
              name={signerFullName || user?.name || (lang === 'es' ? '(se ingresa al firmar)' : '(entered when signing)')}
              detail={user?.email || ''}
              detail2={signerDni ? `DNI: ${signerDni}` : ''}
              color="rgba(232,68,30,0.05)"
              accent
            />
          </div>

          {/* Services table */}
          <div style={{ marginBottom: 20 }}>
            <SectionLabel label={lang === 'es' ? 'SERVICIOS CONTRATADOS' : 'CONTRACTED SERVICES'} />
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: 'var(--surface-2)', padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {lang === 'es' ? 'Servicio' : 'Service'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>
                  {lang === 'es' ? 'Precio' : 'Price'}
                </span>
              </div>
              {servicesList.map((svc, i) => (
                <div key={i} style={{
                  padding: '10px 16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 12,
                  borderTop: '1px solid var(--border)',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{svc.name}</div>
                    {svc.detail && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{svc.detail}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {svc.price === 0 ? (lang === 'es' ? 'Incluido' : 'Included') : formatPrice(svc.price, currency)}
                  </div>
                </div>
              ))}
              {/* Total row */}
              <div style={{ padding: '12px 16px', background: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>TOTAL</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--orange)' }}>{formatPrice(total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment schedule for phased plans */}
          {isPhased && plan.payment_schedule && (
            <div style={{ marginBottom: 20 }}>
              <SectionLabel label={lang === 'es' ? 'CRONOGRAMA DE PAGOS' : 'PAYMENT SCHEDULE'} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.payment_schedule.map((ph, i) => {
                  const amount = Math.round(total * ph.pct / 100 * 100) / 100
                  const isFirst = i === 0
                  return (
                    <div key={ph.phase} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: isFirst ? 'rgba(232,68,30,0.06)' : 'var(--surface-2)',
                      borderRadius: 10,
                      border: isFirst ? '1px solid rgba(232,68,30,0.2)' : '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isFirst ? 'var(--orange)' : 'var(--border)',
                        color: isFirst ? 'white' : 'var(--text-2)',
                        fontSize: 12, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {ph.phase}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                          {ph.label?.[lang] || ph.label?.es}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{ph.pct}% del total</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: isFirst ? 'var(--orange)' : 'var(--text)' }}>
                          {formatPrice(amount, currency)}
                        </div>
                        {isFirst && <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700 }}>HOY</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Legal text */}
          <div style={{ marginBottom: 24 }}>
            <SectionLabel label={lang === 'es' ? 'TÉRMINOS Y CONDICIONES' : 'TERMS AND CONDITIONS'} />
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '16px 18px',
              maxHeight: 200,
              overflowY: 'auto',
              fontSize: 12,
              color: 'var(--text-2)',
              lineHeight: 1.75,
              background: 'var(--bg)',
            }}>
              {lang === 'es' ? <>
                <p style={{ marginTop: 0 }}><strong>1. OBJETO.</strong> El presente contrato tiene por objeto establecer los términos y condiciones bajo los cuales Nithrox Agency S.A.C. (en adelante "Nithrox") prestará los servicios digitales detallados en la sección de Servicios Contratados al cliente (en adelante "el Cliente").</p>
                <p><strong>2. OBLIGACIONES DE NITHROX.</strong> Nithrox se compromete a: (a) ejecutar los servicios con los más altos estándares de calidad; (b) cumplir con los plazos acordados; (c) mantener comunicación constante sobre el avance del proyecto; (d) realizar revisiones dentro del alcance pactado.</p>
                <p><strong>3. OBLIGACIONES DEL CLIENTE.</strong> El Cliente se compromete a: (a) proporcionar la información, contenidos y materiales necesarios en un plazo no mayor a 5 días hábiles desde la solicitud; (b) realizar los pagos en los plazos establecidos en el cronograma; (c) designar un responsable de proyecto para la comunicación. El incumplimiento del pago en la fase correspondiente podrá suspender el desarrollo del proyecto sin responsabilidad para Nithrox.</p>
                <p><strong>4. PROPIEDAD INTELECTUAL.</strong> Una vez realizados todos los pagos establecidos en el contrato, el Cliente adquiere los derechos de uso sobre el resultado final del proyecto. Nithrox conserva los derechos morales de autoría sobre el diseño y código base desarrollado.</p>
                <p><strong>5. GARANTÍA.</strong> Nithrox garantiza el correcto funcionamiento de los entregables por un período de 30 días desde la entrega final, cubriendo correcciones de bugs originados en el desarrollo. No cubre modificaciones de contenido ni nuevos requerimientos.</p>
                <p><strong>6. CONFIDENCIALIDAD.</strong> Ambas partes se comprometen a mantener confidencial toda información sensible intercambiada durante la vigencia del contrato y por un período de 2 años posterior a su terminación.</p>
                <p><strong>7. POLÍTICA DE CANCELACIÓN.</strong> En caso de cancelación por el Cliente: antes del inicio del desarrollo, se devuelve el 80% del pago inicial; durante el desarrollo, no procede devolución por la fase en curso. En caso de cancelación por Nithrox, se devolverá el 100% de los pagos realizados.</p>
                <p><strong>8. FIRMA DIGITAL.</strong> La firma digital del cliente, acompañada de su identificación y dirección IP, tiene la misma validez legal que una firma manuscrita, conforme a la Ley N° 27269 de Firmas y Certificados Digitales del Perú.</p>
                <p style={{ marginBottom: 0 }}><strong>9. JURISDICCIÓN.</strong> Cualquier controversia derivada del presente contrato será resuelta conforme a la legislación peruana vigente, con jurisdicción exclusiva en los tribunales de Lima, Perú.</p>
              </> : <>
                <p style={{ marginTop: 0 }}><strong>1. PURPOSE.</strong> This contract establishes the terms and conditions under which Nithrox Agency S.A.C. ("Nithrox") will provide the digital services detailed in the Contracted Services section to the client ("Client").</p>
                <p><strong>2. NITHROX OBLIGATIONS.</strong> Nithrox commits to: (a) execute services to the highest quality standards; (b) meet agreed timelines; (c) maintain constant communication on project progress; (d) make revisions within the agreed scope.</p>
                <p><strong>3. CLIENT OBLIGATIONS.</strong> The Client commits to: (a) provide necessary information, content, and materials within 5 business days of request; (b) make payments according to the established schedule; (c) designate a project manager. Failure to pay in the corresponding phase may suspend project development without liability for Nithrox.</p>
                <p><strong>4. INTELLECTUAL PROPERTY.</strong> Once all payments are completed, the Client acquires usage rights over the final project result. Nithrox retains moral authorship rights over the base design and code developed.</p>
                <p><strong>5. WARRANTY.</strong> Nithrox guarantees proper functioning of deliverables for 30 days from final delivery, covering bug fixes originating in development. Does not cover content modifications or new requirements.</p>
                <p><strong>6. CONFIDENTIALITY.</strong> Both parties commit to keeping all sensitive information exchanged during the contract and for 2 years after its termination strictly confidential.</p>
                <p><strong>7. CANCELLATION POLICY.</strong> Client cancellation: before development starts, 80% of the initial payment is refunded; during development, no refund for the current phase. Nithrox cancellation: 100% of payments made will be refunded.</p>
                <p><strong>8. DIGITAL SIGNATURE.</strong> The client's digital signature, together with their ID and IP address, has the same legal validity as a handwritten signature, in accordance with Peruvian Law N° 27269 on Digital Signatures.</p>
                <p style={{ marginBottom: 0 }}><strong>9. JURISDICTION.</strong> Any dispute arising from this contract shall be resolved under current Peruvian law, with exclusive jurisdiction in the courts of Lima, Peru.</p>
              </>}
            </div>
          </div>

          {/* ── SIGNATURE SECTION ── */}
          <div style={{ borderTop: '2px dashed var(--border)', paddingTop: 24 }}>
            <SectionLabel label={lang === 'es' ? 'FIRMA DEL CLIENTE' : 'CLIENT SIGNATURE'} />

            {/* Identity fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                  {lang === 'es' ? 'Nombre completo *' : 'Full name *'}
                </label>
                <input
                  type="text"
                  value={signerFullName}
                  onChange={e => setSignerFullName(e.target.value)}
                  placeholder={lang === 'es' ? 'Juan García López' : 'John Smith'}
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--orange)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                  {lang === 'es' ? 'DNI / Pasaporte *' : 'ID / Passport *'}
                </label>
                <input
                  type="text"
                  value={signerDni}
                  onChange={e => setSignerDni(e.target.value)}
                  placeholder="12345678"
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.08em', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--orange)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Draw / Type tabs */}
            <div style={{ display: 'flex', gap: 0, background: 'var(--surface-2)', borderRadius: 10, padding: 3, marginBottom: 14, width: 'fit-content' }}>
              {[
                { id: 'draw', label: lang === 'es' ? '✏️ Dibujar firma' : '✏️ Draw signature' },
                { id: 'type', label: lang === 'es' ? 'Aa Escribir nombre' : 'Aa Type name' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  style={{
                    padding: '8px 18px',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: tab === t.id ? 'var(--surface)' : 'transparent',
                    color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
                    boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Canvas */}
            <div style={{
              position: 'relative',
              border: `2px ${hasSignature ? 'solid' : 'dashed'} ${hasSignature ? 'var(--orange)' : 'var(--border)'}`,
              borderRadius: 12,
              overflow: 'hidden',
              background: hasSignature ? 'rgba(232,68,30,0.02)' : 'var(--surface-2)',
              transition: 'border-color 0.2s, background 0.2s',
            }}>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '130px', display: 'block', touchAction: 'none', cursor: tab === 'draw' ? 'crosshair' : 'default' }}
                onPointerDown={tab === 'draw' ? startDraw : undefined}
                onPointerMove={tab === 'draw' ? draw : undefined}
                onPointerUp={tab === 'draw' ? endDraw : undefined}
                onPointerLeave={tab === 'draw' ? endDraw : undefined}
              />
              {!hasSignature && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', flexDirection: 'column', gap: 6 }}>
                  {tab === 'draw'
                    ? <><Pen size={20} color="var(--text-3)" /><span style={{ fontSize: 13, color: 'var(--text-3)' }}>{lang === 'es' ? 'Dibuja tu firma aquí' : 'Draw your signature here'}</span></>
                    : <><Type size={20} color="var(--text-3)" /><span style={{ fontSize: 13, color: 'var(--text-3)' }}>{lang === 'es' ? 'Escribe tu nombre abajo' : 'Type your name below'}</span></>
                  }
                </div>
              )}
              <button
                type="button"
                onClick={clearCanvas}
                style={{
                  position: 'absolute',
                  top: 8, right: 8,
                  fontSize: 11,
                  color: 'var(--text-3)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '3px 10px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {lang === 'es' ? 'Limpiar' : 'Clear'}
              </button>
            </div>

            {tab === 'type' && (
              <input
                type="text"
                value={typedName}
                onChange={handleTypedName}
                placeholder={signerFullName || (lang === 'es' ? 'Escribe tu nombre completo' : 'Type your full name')}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '11px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 22,
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  color: 'var(--text)',
                  background: 'var(--surface)',
                  outline: 'none',
                }}
              />
            )}

            {hasSignature && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>
                  {lang === 'es' ? 'Firma capturada' : 'Signature captured'}
                </span>
              </div>
            )}
          </div>

          {/* Security footer inside document */}
          <div style={{
            marginTop: 20,
            padding: '12px 14px',
            background: 'var(--surface-2)',
            borderRadius: 10,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}>
            <Lock size={13} color="var(--text-3)" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-2)' }}>Seguridad del contrato:</strong>{' '}
              {lang === 'es'
                ? `Este contrato es procesado con firma digital. Número de contrato: ${contractNum} · IP del firmante: ${ip || 'detectando...'} · Fecha: ${today}`
                : `This contract is processed with digital signature. Contract number: ${contractNum} · Signer IP: ${ip || 'detecting...'} · Date: ${today}`
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── ACCEPT & SIGN PANEL ─────────────────────────────── */}
      <div style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 16,
      }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: accepted ? 0 : 16 }}>
          <div style={{
            width: 20, height: 20,
            border: `2px solid ${accepted ? 'var(--orange)' : 'var(--border)'}`,
            borderRadius: 5,
            background: accepted ? 'var(--orange)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
            marginTop: 1,
            cursor: 'pointer',
          }}
            onClick={() => setAccepted(v => !v)}
          >
            {accepted && <Check size={12} color="white" strokeWidth={3} />}
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {lang === 'es'
              ? <>He leído detenidamente el contrato en su totalidad. Declaro que la información proporcionada es verídica y acepto los <a href="/terms" style={{ color: 'var(--orange)', fontWeight: 600 }} target="_blank" rel="noreferrer">términos y condiciones</a> de Nithrox Agency S.A.C.</>
              : <>I have carefully read the entire contract. I declare that the information provided is truthful and accept the <a href="/terms" style={{ color: 'var(--orange)', fontWeight: 600 }} target="_blank" rel="noreferrer">terms and conditions</a> of Nithrox Agency S.A.C.</>
            }
          </span>
        </label>

        {error && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => router.push('/checkout/review')}
            style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0 }}
          >
            ← {lang === 'es' ? 'Atrás' : 'Back'}
          </button>
          <button
            onClick={handleSign}
            disabled={signing}
            style={{
              flex: 1,
              padding: '14px 28px',
              background: 'var(--orange)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: signing ? 'not-allowed' : 'pointer',
              opacity: signing ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!signing) e.currentTarget.style.background = 'var(--orange-hover)' }}
            onMouseLeave={e => { if (!signing) e.currentTarget.style.background = 'var(--orange)' }}
          >
            {signing && <span className="spinner" />}
            {signing
              ? (lang === 'es' ? 'Firmando...' : 'Signing...')
              : <><Shield size={15} /> {lang === 'es' ? 'Firmar y continuar al pago' : 'Sign and proceed to payment'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function PartyCard({ role, name, detail, detail2, color, accent }) {
  return (
    <div style={{ background: color, borderRadius: 12, padding: '14px 16px', border: accent ? '1px solid rgba(232,68,30,0.15)' : '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: accent ? 'var(--orange)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {role}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{name}</div>
      {detail  && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{detail}</div>}
      {detail2 && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{detail2}</div>}
    </div>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
      {label}
    </div>
  )
}
