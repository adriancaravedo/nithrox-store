'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'
import StepHeader from '@/components/checkout/StepHeader'
import { Copy, Check, Info } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

const CRYPTOS = [
  { id: 'btc',  name: 'Bitcoin',  symbol: 'BTC', icon: '₿' },
  { id: 'eth',  name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
  { id: 'usdt', name: 'USDT',     symbol: 'USDT',icon: '₮' },
  { id: 'sol',  name: 'Solana',   symbol: 'SOL', icon: '◎' },
]

const AUTO_METHODS   = ['stripe', 'izipay', 'paypal']

export default function PaymentPage() {
  const store = useCheckoutStore()
  const { lang, currency, plan } = store
  const isKitDigital = plan?.id === 'kit-digital'

  return (
    <Elements stripe={stripePromise} options={{ locale: lang === 'es' ? 'es' : 'en' }}>
      <PaymentInner isKitDigital={isKitDigital} />
    </Elements>
  )
}

function PaymentInner({ isKitDigital }) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const {
    lang, currency, plan, addons, hosting, domain, user,
    signatureDataUrl, kitDigitalOfferAccepted,
    getTotal, getFirstPayment, setOrderId, setPaymentMethod,
  } = useCheckoutStore()

  const total        = getTotal()
  const firstPayment = getFirstPayment ? getFirstPayment() : total
  const isPhased     = !!(plan?.payment_schedule)
  const payingNow    = isPhased ? firstPayment : total

  const TABS = [
    { id: 'stripe',   label: 'Tarjeta',       labelEn: 'Card',     icon: '💳' },
    { id: 'crypto',   label: 'Cripto',        labelEn: 'Crypto',   icon: '₿'  },
    { id: 'transfer', label: 'Transferencia', labelEn: 'Transfer', icon: '🏧' },
  ]

  const [activeTab, setActiveTab] = useState('stripe')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [cardReady, setCardReady] = useState(false)

  const [selectedCrypto, setSelectedCrypto]   = useState(null)
  const [cryptoPayment, setCryptoPayment]     = useState(null)
  const [cryptoCountdown, setCryptoCountdown] = useState(900)
  const [copied, setCopied]                   = useState(false)

  const [voucherFile, setVoucherFile] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!cryptoPayment) return
    const interval = setInterval(() => {
      setCryptoCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [cryptoPayment])

  function countdownStr(s) {
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  }

  function goToThanks(orderId, method) {
    setOrderId(orderId)
    setPaymentMethod(method)
    const isAuto = AUTO_METHODS.includes(method)
    router.push(`/checkout/thanks?orderId=${orderId}&method=${method}&auto=${isAuto}`)
  }

  async function createOrder(paymentMethod, extraData = {}) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id:            plan?.id,
        plan_name:          plan?.name,
        plan_price:         plan?.price_pen,
        addons,
        hosting,
        domain,
        user_id:            user?.id,
        user_name:          user?.name,
        user_email:         user?.email,
        user_phone:         user?.phone,
        user_company:       user?.company,
        signature_data_url: signatureDataUrl,
        payment_method:     paymentMethod,
        total_pen:          total,
        first_payment_pen:  payingNow,
        is_phased:          isPhased,
        kit_digital_trial:  isKitDigital && kitDigitalOfferAccepted,
        currency,
        lang,
        ...extraData,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error creating order')
    return data.orderId
  }

  // ── STRIPE ─────────────────────────────────────────────────
  async function handleStripeSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setError('')
    setLoading(true)

    try {
      const cardElement = elements.getElement(CardElement)

      if (isKitDigital) {
        // ── KIT DIGITAL: SetupIntent → Subscription with 31-day trial ──
        const siRes = await fetch('/api/stripe/setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_email: user?.email, customer_name: user?.name }),
        })
        const siData = await siRes.json()
        if (siData.error) throw new Error(siData.error)

        // Confirm card setup (verifies card without charging)
        const { setupIntent, error: setupErr } = await stripe.confirmCardSetup(siData.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: user?.name, email: user?.email },
          },
        })
        if (setupErr) throw new Error(setupErr.message)

        // Create order in DB
        const orderId = await createOrder('stripe', { stripe_customer_id: siData.customerId })

        // Create annual subscription with trial
        const subRes = await fetch('/api/stripe/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id:       siData.customerId,
            payment_method_id: setupIntent.payment_method,
            amount_pen:        total,
            order_id:          orderId,
            plan_name:         plan?.name,
          }),
        })
        const subData = await subRes.json()
        if (subData.error) throw new Error(subData.error)

        goToThanks(orderId, 'stripe')

      } else {
        // ── REGULAR PLAN: PaymentIntent → immediate charge ──
        const orderId = await createOrder('stripe')

        const piRes = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount_pen: payingNow, currency, customer_email: user?.email, order_id: orderId }),
        })
        const piData = await piRes.json()
        if (piData.error) throw new Error(piData.error)

        // Actually charge the card
        const { paymentIntent, error: payErr } = await stripe.confirmCardPayment(piData.clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: user?.name, email: user?.email },
          },
        })
        if (payErr) throw new Error(payErr.message)
        if (paymentIntent.status !== 'succeeded') throw new Error('El pago no fue aprobado')

        goToThanks(orderId, 'stripe')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── CRYPTO ─────────────────────────────────────────────────
  async function handleCryptoSelect(crypto) {
    setSelectedCrypto(crypto)
    setCryptoPayment(null)
    setCryptoCountdown(900)
    setError('')
    setLoading(true)
    try {
      const orderId = await createOrder('crypto')
      const res = await fetch('/api/nowpayments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: payingNow, currency_code: crypto.id, order_id: orderId }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCryptoPayment({ ...data, _orderId: orderId })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCryptoConfirm() {
    setLoading(true)
    try {
      const orderId = cryptoPayment?._orderId
      if (!orderId) throw new Error('No order ID')
      goToThanks(orderId, 'crypto')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function copyAddress() {
    if (!cryptoPayment?.pay_address) return
    await navigator.clipboard.writeText(cryptoPayment.pay_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── TRANSFER ───────────────────────────────────────────────
  async function handleTransferSubmit() {
    if (!voucherFile) {
      setError(lang === 'es' ? 'Por favor sube el comprobante de pago.' : 'Please upload your payment receipt.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('voucher', voucherFile)
      formData.append('amount', payingNow)
      formData.append('currency', currency)
      await fetch('/api/orders/submit-transfer', { method: 'POST', body: formData })
      const orderId = await createOrder('transfer')
      goToThanks(orderId, 'transfer')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const tabBtn = (active) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', border: 'none', borderRadius: 9,
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    background: active ? 'var(--orange)' : 'transparent',
    color: active ? 'white' : 'var(--text-2)',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  })

  const primaryBtn = (disabled) => ({
    width: '100%', padding: '14px',
    background: disabled ? 'var(--border)' : 'var(--orange)',
    color: disabled ? 'var(--text-3)' : 'white',
    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 8, transition: 'background 0.15s',
  })

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '15px',
        fontFamily: 'inherit',
        color: 'var(--text)',
        '::placeholder': { color: 'var(--text-3)' },
        iconColor: 'var(--text-2)',
      },
      invalid: { color: '#dc2626', iconColor: '#dc2626' },
    },
    hidePostalCode: true,
  }

  return (
    <div className="slide-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Elige cómo pagar' : 'Choose how to pay'}
        subtitle={isPhased
          ? (lang === 'es' ? 'Pago inicial — Fase 1' : 'Initial payment — Phase 1')
          : isKitDigital && kitDigitalOfferAccepted
            ? (lang === 'es' ? 'Suscripción anual · 1er mes gratis' : 'Annual subscription · 1st month free')
            : (lang === 'es' ? 'Pago único' : 'One-time payment')
        }
      />

      {/* Kit Digital trial banner */}
      {isKitDigital && kitDigitalOfferAccepted && (
        <div style={{
          background: 'rgba(232,68,30,0.06)', border: '1px solid rgba(232,68,30,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Info size={14} color="var(--orange)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {lang === 'es'
              ? <>Tu tarjeta no será cobrada hoy. El primer cobro de <strong style={{ color: 'var(--orange)' }}>{formatPrice(total, currency)}/año</strong> se realizará en 31 días.</>
              : <>Your card will not be charged today. The first charge of <strong style={{ color: 'var(--orange)' }}>{formatPrice(total, currency)}/year</strong> will happen in 31 days.</>
            }
          </div>
        </div>
      )}

      {/* Phased payment banner */}
      {isPhased && (
        <div style={{
          background: 'rgba(232,68,30,0.06)', border: '1px solid rgba(232,68,30,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Info size={14} color="var(--orange)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {lang === 'es'
              ? <>Hoy pagas solo el <strong style={{ color: 'var(--orange)' }}>10% → {formatPrice(payingNow, currency)}</strong> para iniciar. Total del plan: {formatPrice(total, currency)} en 4 fases.</>
              : <>Today you only pay <strong style={{ color: 'var(--orange)' }}>10% → {formatPrice(payingNow, currency)}</strong> to start. Plan total: {formatPrice(total, currency)} in 4 phases.</>
            }
          </div>
        </div>
      )}

      {/* Amount display */}
      <div style={{
        background: 'var(--text)', borderRadius: 12, padding: '14px 20px', marginBottom: 20,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {isKitDigital && kitDigitalOfferAccepted
              ? (lang === 'es' ? 'Pagas hoy' : 'You pay today')
              : (lang === 'es' ? 'Pagas hoy' : 'You pay today')
            }
          </div>
          {isPhased && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {lang === 'es' ? 'Fase 1 de 4' : 'Phase 1 of 4'}
            </div>
          )}
          {isKitDigital && kitDigitalOfferAccepted && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {lang === 'es' ? 'Luego S/ ' + total + '/año' : 'Then S/ ' + total + '/year'}
            </div>
          )}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--orange)', letterSpacing: '-0.02em' }}>
          {isKitDigital && kitDigitalOfferAccepted ? 'S/ 0.00' : formatPrice(payingNow, currency)}
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 12, padding: 4, marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError('') }} style={tabBtn(activeTab === tab.id)}>
            <span>{tab.icon}</span>
            {lang === 'es' ? tab.label : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24 }}>

        {/* ── STRIPE ── */}
        {activeTab === 'stripe' && (
          <form onSubmit={handleStripeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'es' ? 'Tarjeta de crédito / débito' : 'Credit / Debit card'}
            </div>

            {/* Stripe Card Element */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
                {lang === 'es' ? 'Datos de la tarjeta' : 'Card details'}
              </label>
              <div style={{
                padding: '14px 16px',
                border: '1.5px solid var(--border)',
                borderRadius: 10,
                background: 'var(--surface)',
              }}>
                <CardElement
                  options={cardElementOptions}
                  onChange={e => {
                    setCardReady(e.complete)
                    if (e.error) setError(e.error.message)
                    else setError('')
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>
                🔒 {lang === 'es' ? 'Tus datos son procesados de forma segura por Stripe' : 'Your data is securely processed by Stripe'}
              </p>
            </div>

            {isKitDigital && kitDigitalOfferAccepted && (
              <div style={{ fontSize: 13, color: 'var(--text-2)', background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px' }}>
                {lang === 'es'
                  ? '🎁 Tu suscripción iniciará con 31 días gratis. No se realizará ningún cobro hoy.'
                  : '🎁 Your subscription will start with 31 free days. No charge will be made today.'}
              </div>
            )}

            {error && <ErrorBox msg={error} />}

            <button type="submit" disabled={loading || !stripe || !cardReady} style={primaryBtn(loading || !stripe || !cardReady)}>
              {loading
                ? <><span className="spinner" />{lang === 'es' ? 'Procesando...' : 'Processing...'}</>
                : isKitDigital && kitDigitalOfferAccepted
                  ? (lang === 'es' ? 'Activar suscripción gratis →' : 'Activate free subscription →')
                  : `${lang === 'es' ? 'Pagar' : 'Pay'} ${formatPrice(payingNow, currency)} →`
              }
            </button>
          </form>
        )}

        {/* ── CRYPTO ── */}
        {activeTab === 'crypto' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'es' ? 'Criptomonedas' : 'Cryptocurrency'}
            </div>
            {!cryptoPayment ? (
              <>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{lang === 'es' ? 'Selecciona tu criptomoneda:' : 'Select your cryptocurrency:'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {CRYPTOS.map(c => (
                    <button key={c.id} onClick={() => handleCryptoSelect(c)} disabled={loading}
                      style={{
                        padding: '14px 16px',
                        border: selectedCrypto?.id === c.id ? '2px solid var(--orange)' : '1.5px solid var(--border)',
                        borderRadius: 12, background: selectedCrypto?.id === c.id ? 'var(--orange-tint)' : 'var(--surface)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading && selectedCrypto?.id !== c.id ? 0.5 : 1,
                        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', transition: 'all 0.15s',
                      }}>
                      <span style={{ fontSize: 22, fontWeight: 800 }}>{c.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{c.symbol}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {loading && (
                  <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span className="spinner spinner-dark" />
                    {lang === 'es' ? 'Generando dirección...' : 'Generating address...'}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--text)', borderRadius: 14, padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{selectedCrypto?.icon}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600 }}>{lang === 'es' ? 'Dirección de pago' : 'Payment address'}</div>
                  <div style={{ fontSize: 12, color: 'white', fontFamily: 'monospace', wordBreak: 'break-all', marginBottom: 12, lineHeight: 1.6 }}>{cryptoPayment.pay_address}</div>
                  <button onClick={copyAddress}
                    style={{ padding: '7px 16px', background: copied ? 'rgba(22,163,74,0.2)' : 'rgba(255,255,255,0.1)', border: `1px solid ${copied ? 'rgba(22,163,74,0.4)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 8, color: copied ? '#86efac' : 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? (lang === 'es' ? 'Copiado' : 'Copied') : (lang === 'es' ? 'Copiar dirección' : 'Copy address')}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--orange-tint)', border: '1px solid rgba(232,68,30,0.2)', borderRadius: 12, padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{lang === 'es' ? 'Monto a enviar' : 'Amount to send'}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{cryptoPayment.pay_amount} {cryptoPayment.pay_currency?.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-2)', padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cryptoCountdown > 0 ? 'var(--orange)' : '#dc2626', animation: cryptoCountdown > 0 ? 'pulse 1.5s infinite' : 'none' }} />
                    {lang === 'es' ? 'Esperando confirmación...' : 'Waiting for confirmation...'}
                  </div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: cryptoCountdown < 60 ? '#dc2626' : 'var(--text)' }}>{countdownStr(cryptoCountdown)}</span>
                </div>
                <button onClick={handleCryptoConfirm} disabled={loading} style={primaryBtn(loading)}>
                  {loading ? <><span className="spinner" />...</> : (lang === 'es' ? 'Ya transferí, continuar →' : 'Already sent, continue →')}
                </button>
              </div>
            )}
            {error && <ErrorBox msg={error} />}
          </div>
        )}

        {/* ── TRANSFER ── */}
        {activeTab === 'transfer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'es' ? 'Transferencia bancaria' : 'Bank Transfer'}
            </div>
            <div style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: lang === 'es' ? 'Banco' : 'Bank', value: 'BCP', mono: false },
                { label: lang === 'es' ? 'Cuenta' : 'Account', value: '193-24521234-0-89', mono: true },
                { label: 'CCI', value: '002-193-002452123489-13', mono: true },
                { label: lang === 'es' ? 'Beneficiario' : 'Beneficiary', value: 'Nithrox Agency S.A.C.', mono: false },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text)', fontFamily: row.mono ? 'monospace' : 'inherit' }}>{row.value}</span>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{lang === 'es' ? 'Monto exacto' : 'Exact amount'}</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--orange)' }}>{formatPrice(payingNow, 'PEN')}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>
                {lang === 'es' ? 'Subir comprobante *' : 'Upload receipt *'}
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--orange)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {voucherFile ? (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{voucherFile.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>({(voucherFile.size / 1024).toFixed(0)} KB)</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{lang === 'es' ? 'Haz clic o arrastra tu comprobante aquí' : 'Click or drag your receipt here'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>JPG, PNG, PDF (máx. 5 MB)</div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setVoucherFile(e.target.files[0] || null)} />
            </div>
            {error && <ErrorBox msg={error} />}
            <button onClick={handleTransferSubmit} disabled={loading || !voucherFile} style={primaryBtn(loading || !voucherFile)}>
              {loading ? <><span className="spinner" />{lang === 'es' ? 'Enviando...' : 'Sending...'}</> : (lang === 'es' ? 'Enviar comprobante →' : 'Send receipt →')}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button onClick={() => router.push('/checkout/contract')} style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
      {msg}
    </div>
  )
}
