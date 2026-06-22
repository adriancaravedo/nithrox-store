'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { formatPrice } from '@/lib/data'
import {
  CheckCircle, Clock, Upload, ExternalLink, LayoutDashboard,
  Copy, Check, RefreshCw, Shield
} from 'lucide-react'

const AUTO_METHODS  = ['stripe', 'izipay', 'paypal']
const METHOD_LABELS = {
  stripe:   { es: 'Tarjeta de crédito',   en: 'Credit card'    },
  izipay:   { es: 'Izipay',               en: 'Izipay'         },
  paypal:   { es: 'PayPal',               en: 'PayPal'         },
  transfer: { es: 'Transferencia bancaria',en: 'Bank transfer'  },
  crypto:   { es: 'Criptomoneda',         en: 'Cryptocurrency' },
}

function ThanksContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { lang, currency, plan, orderId: storedOrderId, contractNumber, getTotal, user, reset } = useCheckoutStore()

  const method  = searchParams.get('method')   || 'stripe'
  const orderId = searchParams.get('orderId')  || storedOrderId
  const isAuto  = AUTO_METHODS.includes(method)

  const total = getTotal()

  // Voucher re-upload for manual payments (optional)
  const [voucherFile, setVoucherFile]     = useState(null)
  const [voucherUploaded, setVoucherUploaded] = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [copied, setCopied]               = useState(false)
  const fileRef = useRef(null)

  // Animated entrance
  const [showCheck, setShowCheck] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 200)
    return () => clearTimeout(t)
  }, [])

  async function uploadVoucher() {
    if (!voucherFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('voucher', voucherFile)
      formData.append('order_id', orderId || '')
      await fetch('/api/orders/submit-transfer', { method: 'POST', body: formData })
      setVoucherUploaded(true)
    } catch {}
    setUploading(false)
  }

  async function copyOrderId() {
    if (!orderId) return
    await navigator.clipboard.writeText(orderId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function goToDashboard() {
    // Client portal — opens admin client-facing dashboard
    // In production this would be the client portal URL
    window.open(process.env.NEXT_PUBLIC_CLIENT_PORTAL_URL || 'https://nithrox.com/portal', '_blank')
  }

  const today = new Date().toLocaleDateString(lang === 'es' ? 'es-PE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 80 }}>
      {/* ── SUCCESS / VALIDATING HERO ── */}
      {isAuto ? (
        /* AUTO PAYMENT SUCCESS */
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* Animated check */}
          <div style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'rgba(22,163,74,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            transform: showCheck ? 'scale(1)' : 'scale(0)',
          }}>
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(22,163,74,0.3)" strokeWidth="3" />
              <circle
                cx="24" cy="24" r="22" fill="none"
                stroke="var(--green)" strokeWidth="3"
                strokeDasharray="138.2" strokeDashoffset={showCheck ? 0 : 138.2}
                style={{ transition: 'stroke-dashoffset 0.6s ease 0.2s', transformOrigin: 'center', transform: 'rotate(-90deg)' }}
              />
              <polyline
                points="14,24 21,31 34,17" fill="none"
                stroke="var(--green)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray="28" strokeDashoffset={showCheck ? 0 : 28}
                style={{ transition: 'stroke-dashoffset 0.4s ease 0.7s' }}
              />
            </svg>
          </div>

          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
            opacity: showCheck ? 1 : 0,
            transform: showCheck ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.4s ease 0.5s',
          }}>
            {lang === 'es' ? '¡Pago confirmado!' : 'Payment confirmed!'}
          </div>
          <div style={{
            fontSize: 15,
            color: 'var(--text-2)',
            lineHeight: 1.6,
            opacity: showCheck ? 1 : 0,
            transition: 'opacity 0.4s ease 0.7s',
          }}>
            {lang === 'es'
              ? `Tu ${plan?.name || 'plan'} está siendo activado. Recibirás un correo con los detalles en ${user?.email || 'tu correo'}.`
              : `Your ${plan?.name || 'plan'} is being activated. You'll receive an email with details at ${user?.email || 'your email'}.`
            }
          </div>
        </div>
      ) : (
        /* MANUAL PAYMENT — VALIDATING */
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'rgba(232,68,30,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            transform: showCheck ? 'scale(1)' : 'scale(0)',
          }}>
            <Clock size={44} color="var(--orange)" />
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
            opacity: showCheck ? 1 : 0,
            transform: showCheck ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.4s ease 0.5s',
          }}>
            {lang === 'es' ? 'Validando tu pago' : 'Validating your payment'}
          </div>
          <div style={{
            fontSize: 15,
            color: 'var(--text-2)',
            lineHeight: 1.6,
            opacity: showCheck ? 1 : 0,
            transition: 'opacity 0.4s ease 0.7s',
          }}>
            {lang === 'es'
              ? 'Hemos recibido tu solicitud. Nuestro equipo verificará tu comprobante en las próximas horas y activará tus servicios.'
              : 'We have received your request. Our team will verify your receipt within the next few hours and activate your services.'
            }
          </div>
        </div>
      )}

      {/* ── ORDER SUMMARY CARD ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        opacity: showCheck ? 1 : 0,
        transform: showCheck ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.5s ease 0.8s',
      }}>
        <div style={{ background: isAuto ? 'var(--green)' : 'var(--orange)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={16} color="white" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>
            {isAuto
              ? (lang === 'es' ? '✓ Pago procesado exitosamente' : '✓ Payment processed successfully')
              : (lang === 'es' ? '⏳ Pago en validación' : '⏳ Payment being validated')
            }
          </span>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Order ID */}
          {orderId && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                  {lang === 'es' ? 'Nº de pedido' : 'Order number'}
                </div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)' }}>
                  {String(orderId).slice(0, 16)}...
                </div>
              </div>
              <button onClick={copyOrderId} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: copied ? 'var(--green)' : 'var(--text-2)' }}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? (lang === 'es' ? 'Copiado' : 'Copied') : (lang === 'es' ? 'Copiar' : 'Copy')}
              </button>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Plan */}
          {plan && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Plan</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{plan.name}</div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{formatPrice(plan.price_pen, currency)}</div>
            </div>
          )}

          {/* Contract number */}
          {contractNumber && (
            <>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                  {lang === 'es' ? 'Nº contrato' : 'Contract number'}
                </div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-2)' }}>{contractNumber}</div>
              </div>
            </>
          )}

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Payment method */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                {lang === 'es' ? 'Método de pago' : 'Payment method'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {METHOD_LABELS[method]?.[lang] || method}
              </div>
            </div>
            <div style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              background: isAuto ? 'rgba(22,163,74,0.1)' : 'rgba(232,68,30,0.1)',
              color: isAuto ? 'var(--green)' : 'var(--orange)',
            }}>
              {isAuto ? (lang === 'es' ? 'Aprobado' : 'Approved') : (lang === 'es' ? 'En revisión' : 'Under review')}
            </div>
          </div>

          {/* Date */}
          <div style={{ height: 1, background: 'var(--border)' }} />
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{today}</div>
        </div>
      </div>

      {/* ── VOUCHER UPLOAD (manual only, if not uploaded yet) ── */}
      {!isAuto && !voucherUploaded && (
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 16,
          opacity: showCheck ? 1 : 0,
          transition: 'opacity 0.5s ease 1s',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {lang === 'es' ? '¿No subiste tu comprobante?' : 'Did not upload your receipt?'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
            {lang === 'es' ? 'Súbelo ahora para agilizar la validación.' : 'Upload it now to speed up validation.'}
          </div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s', marginBottom: 10 }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--orange)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {voucherFile ? (
              <div>
                <div style={{ fontSize: 20, marginBottom: 4 }}>📄</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{voucherFile.name}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-2)' }}>
                <Upload size={18} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {lang === 'es' ? 'Subir comprobante de pago' : 'Upload payment receipt'}
                </span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setVoucherFile(e.target.files[0] || null)} />
          {voucherFile && (
            <button
              onClick={uploadVoucher}
              disabled={uploading}
              style={{ width: '100%', padding: '12px', background: 'var(--orange)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {uploading ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />{lang === 'es' ? 'Enviando...' : 'Sending...'}</> : (lang === 'es' ? 'Enviar comprobante' : 'Send receipt')}
            </button>
          )}
        </div>
      )}

      {voucherUploaded && (
        <div style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} color="var(--green)" />
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
            {lang === 'es' ? 'Comprobante recibido. Te notificaremos por email cuando se valide.' : 'Receipt received. We will notify you by email once validated.'}
          </span>
        </div>
      )}

      {/* ── WHAT HAPPENS NEXT ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 16,
        padding: '20px 24px',
        marginBottom: 24,
        opacity: showCheck ? 1 : 0,
        transition: 'opacity 0.5s ease 1.1s',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
          {lang === 'es' ? '¿Qué sigue?' : 'What happens next?'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(isAuto ? [
            { icon: '📧', title: lang === 'es' ? 'Correo de confirmación' : 'Confirmation email', desc: lang === 'es' ? 'Recibirás el contrato firmado y los datos de acceso.' : 'You will receive the signed contract and access credentials.' },
            { icon: '🚀', title: lang === 'es' ? 'Activación de servicios' : 'Service activation', desc: lang === 'es' ? 'Hosting y dominio activos en 24-48 horas.' : 'Hosting and domain active within 24-48 hours.' },
            { icon: '💬', title: lang === 'es' ? 'Contacto de onboarding' : 'Onboarding call', desc: lang === 'es' ? 'Nuestro equipo te contactará para iniciar el proyecto.' : 'Our team will contact you to start the project.' },
          ] : [
            { icon: '🔍', title: lang === 'es' ? 'Validación del pago' : 'Payment validation', desc: lang === 'es' ? 'Verificamos tu comprobante en 2-4 horas hábiles.' : 'We verify your receipt within 2-4 business hours.' },
            { icon: '📧', title: lang === 'es' ? 'Confirmación por email' : 'Email confirmation', desc: lang === 'es' ? 'Recibirás confirmación con los datos de acceso.' : 'You will receive confirmation with access credentials.' },
            { icon: '🚀', title: lang === 'es' ? 'Activación de servicios' : 'Service activation', desc: lang === 'es' ? 'Tus servicios se activan una vez confirmado el pago.' : 'Your services activate once payment is confirmed.' },
          ]).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA BUTTONS ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: showCheck ? 1 : 0,
        transition: 'opacity 0.5s ease 1.2s',
      }}>
        <button
          onClick={goToDashboard}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'var(--orange)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--orange-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--orange)'}
        >
          <LayoutDashboard size={18} />
          {lang === 'es' ? 'Ir a mi dashboard' : 'Go to my dashboard'}
          <ExternalLink size={14} style={{ opacity: 0.7 }} />
        </button>

        <button
          onClick={() => { reset(); router.push('/') }}
          style={{
            width: '100%',
            padding: '13px 24px',
            background: 'transparent',
            color: 'var(--text-3)',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {lang === 'es' ? 'Volver al inicio' : 'Back to home'}
        </button>
      </div>

      {/* Contact footer */}
      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: 'var(--text-3)' }}>
        {lang === 'es'
          ? <>¿Tienes preguntas? Escríbenos a <a href="mailto:hola@nithrox.com" style={{ color: 'var(--orange)', fontWeight: 600 }}>hola@nithrox.com</a></>
          : <>Questions? Write to us at <a href="mailto:hola@nithrox.com" style={{ color: 'var(--orange)', fontWeight: 600 }}>hola@nithrox.com</a></>
        }
      </div>
    </div>
  )
}

export default function ThanksPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: 60, color: 'var(--text-3)' }}>Cargando...</div>}>
      <ThanksContent />
    </Suspense>
  )
}
