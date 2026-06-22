'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'
import StepHeader from '@/components/checkout/StepHeader'
import { Copy, Check, CreditCard, Info } from 'lucide-react'

const TABS = [
  { id: 'stripe',   label: 'Tarjeta',       labelEn: 'Card',     icon: '💳' },
  { id: 'izipay',   label: 'Izipay',        labelEn: 'Izipay',   icon: '🏦' },
  { id: 'paypal',   label: 'PayPal',        labelEn: 'PayPal',   icon: '🅿️' },
  { id: 'crypto',   label: 'Cripto',        labelEn: 'Crypto',   icon: '₿'  },
  { id: 'transfer', label: 'Transferencia', labelEn: 'Transfer', icon: '🏧' },
]

const CRYPTOS = [
  { id: 'btc',  name: 'Bitcoin',  symbol: 'BTC', icon: '₿' },
  { id: 'eth',  name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
  { id: 'usdt', name: 'USDT',     symbol: 'USDT',icon: '₮' },
  { id: 'sol',  name: 'Solana',   symbol: 'SOL', icon: '◎' },
]

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}
function formatExpiry(val) {
  const clean = val.replace(/\D/g, '').slice(0, 4)
  return clean.length > 2 ? clean.slice(0, 2) + '/' + clean.slice(2) : clean
}

const AUTO_METHODS  = ['stripe', 'izipay', 'paypal']
const MANUAL_METHODS = ['transfer', 'crypto']

export default function PaymentPage() {
  const router = useRouter()
  const {
    lang, currency, plan, addons, hosting, domain, user,
    signatureDataUrl, getTotal, getFirstPayment, setOrderId, setPaymentMethod,
  } = useCheckoutStore()

  const total        = getTotal()
  const firstPayment = getFirstPayment ? getFirstPayment() : total
  const isPhased     = !!(plan?.payment_schedule)
  const payingNow    = isPhased ? firstPayment : total

  const [activeTab, setActiveTab]   = useState('stripe')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' })

  const [selectedCrypto, setSelectedCrypto]     = useState(null)
  const [cryptoPayment, setCryptoPayment]       = useState(null)
  const [cryptoCountdown, setCryptoCountdown]   = useState(900)
  const [copied, setCopied]                     = useState(false)

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

  function countdownStr(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
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
        currency,
        lang,
        ...extraData,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error creating order')
    return data.orderId
  }

  async function handleStripeSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const piRes = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: payingNow, currency, customer_email: user?.email }),
      })
      const piData = await piRes.json()
      const orderId = await createOrder('stripe', { payment_id: piData.clientSecret })
      goToThanks(orderId, 'stripe')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleIzipay() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/izipay/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: payingNow, customer_email: user?.email }),
      })
      const data = await res.json()
      const orderId = await createOrder('izipay')
      if (data.redirectUrl) window.location.href = data.redirectUrl
      else goToThanks(orderId, 'izipay')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePayPal() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: payingNow, currency }),
      })
      const data = await res.json()
      const orderId = await createOrder('paypal', { payment_id: data.id })
      if (data.approvalUrl) window.location.href = data.approvalUrl
      else goToThanks(orderId, 'paypal')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCryptoSelect(crypto) {
    setSelectedCrypto(crypto)
    setCryptoPayment(null)
    setCryptoCountdown(900)
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/nowpayments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: payingNow, currency_code: crypto.id }),
      })
      const data = await res.json()
      setCryptoPayment(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCryptoConfirm() {
    setLoading(true)
    try {
      const orderId = await createOrder('crypto', { payment_id: cryptoPayment?.payment_id })
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

  const tabBtnStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    border: 'none',
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    background: active ? 'var(--orange)' : 'transparent',
    color: active ? 'white' : 'var(--text-2)',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  })

  const primaryBtn = (disabled) => ({
    width: '100%',
    padding: '14px',
    background: disabled ? 'var(--border)' : 'var(--orange)',
    color: disabled ? 'var(--text-3)' : 'white',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    transition: 'background 0.15s',
  })

  return (
    <div className="slide-in" style={{ maxWidth: 560, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Elige cómo pagar' : 'Choose how to pay'}
        subtitle={isPhased
          ? (lang === 'es' ? `Pago inicial — Fase 1` : `Initial payment — Phase 1`)
          : (lang === 'es' ? 'Pago único' : 'One-time payment')
        }
      />

      {/* Phased payment info banner */}
      {isPhased && (
        <div style={{
          background: 'rgba(232,68,30,0.06)',
          border: '1px solid rgba(232,68,30,0.2)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <Info size={14} color="var(--orange)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {lang === 'es'
              ? <>Hoy pagas solo el <strong style={{ color: 'var(--orange)' }}>10% → {formatPrice(payingNow, currency)}</strong> para iniciar el proyecto. El total del plan es {formatPrice(total, currency)}, dividido en 4 fases.</>
              : <>Today you only pay <strong style={{ color: 'var(--orange)' }}>10% → {formatPrice(payingNow, currency)}</strong> to start the project. The total plan is {formatPrice(total, currency)}, split into 4 phases.</>
            }
          </div>
        </div>
      )}

      {/* Amount display */}
      <div style={{
        background: 'var(--text)',
        borderRadius: 12,
        padding: '14px 20px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {lang === 'es' ? 'Pagas hoy' : 'You pay today'}
          </div>
          {isPhased && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              {lang === 'es' ? 'Fase 1 de 4' : 'Phase 1 of 4'}
            </div>
          )}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--orange)', letterSpacing: '-0.02em' }}>
          {formatPrice(payingNow, currency)}
        </div>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 12, padding: 4, marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError('') }}
            style={tabBtnStyle(activeTab === tab.id)}
          >
            <span>{tab.icon}</span>
            {lang === 'es' ? tab.label : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16, padding: 24 }}>

        {/* ── Stripe ── */}
        {activeTab === 'stripe' && (
          <form onSubmit={handleStripeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              {lang === 'es' ? 'Tarjeta de crédito / débito' : 'Credit / Debit card'}
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                {lang === 'es' ? 'Nombre en la tarjeta' : 'Name on card'}
              </label>
              <input type="text" required value={card.name} onChange={e => setCard(c => ({ ...c, name: e.target.value }))} placeholder="Juan García"
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                {lang === 'es' ? 'Número de tarjeta' : 'Card number'}
              </label>
              <input type="text" required value={card.number} onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))} placeholder="4242 4242 4242 4242" maxLength={19}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'monospace', letterSpacing: '0.1em', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>{lang === 'es' ? 'Expiración' : 'Expiry'}</label>
                <input type="text" required value={card.expiry} onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))} placeholder="MM/AA" maxLength={5}
                  style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'monospace', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>CVC</label>
                <input type="text" required value={card.cvc} onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder="123" maxLength={4}
                  style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'monospace', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={loading} style={primaryBtn(loading)}>
              {loading ? <><span className="spinner" />{lang === 'es' ? 'Procesando...' : 'Processing...'}</> : `${lang === 'es' ? 'Pagar' : 'Pay'} ${formatPrice(payingNow, currency)}`}
            </button>
          </form>
        )}

        {/* ── Izipay ── */}
        {activeTab === 'izipay' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '12px 0' }}>
            <div style={{ width: 72, height: 72, background: 'rgba(37,99,235,0.08)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🏦</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                {lang === 'es' ? 'Tarjetas peruanas Visa, Mastercard, Amex' : 'Peruvian cards Visa, Mastercard, Amex'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {lang === 'es' ? 'Serás redirigido a la pasarela de Izipay.' : 'You will be redirected to Izipay.'}
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <button onClick={handleIzipay} disabled={loading} style={{ ...primaryBtn(loading), background: '#2563EB', width: '100%' }}>
              {loading ? <><span className="spinner" />...</> : `${lang === 'es' ? 'Pagar con Izipay' : 'Pay with Izipay'} — ${formatPrice(payingNow, currency)}`}
            </button>
          </div>
        )}

        {/* ── PayPal ── */}
        {activeTab === 'paypal' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '12px 0' }}>
            <div style={{ width: 72, height: 72, background: 'rgba(0,112,186,0.08)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🅿️</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>PayPal</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {lang === 'es' ? 'Paga de forma rápida y segura con tu cuenta PayPal.' : 'Pay quickly and securely with your PayPal account.'}
              </div>
            </div>
            {error && <ErrorBox msg={error} />}
            <button onClick={handlePayPal} disabled={loading} style={{ ...primaryBtn(loading), background: '#0070BA', width: '100%' }}>
              {loading ? <><span className="spinner" />...</> : `PayPal — ${formatPrice(payingNow, currency)}`}
            </button>
          </div>
        )}

        {/* ── Crypto ── */}
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
                        borderRadius: 12,
                        background: selectedCrypto?.id === c.id ? 'var(--orange-tint)' : 'var(--surface)',
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
                    {lang === 'es' ? 'Generando dirección de pago...' : 'Generating payment address...'}
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
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cryptoCountdown > 0 ? 'var(--orange)' : 'var(--red)', animation: cryptoCountdown > 0 ? 'pulse 1.5s infinite' : 'none' }} />
                    {lang === 'es' ? 'Esperando confirmación...' : 'Waiting for confirmation...'}
                  </div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: cryptoCountdown < 60 ? 'var(--red)' : 'var(--text)' }}>{countdownStr(cryptoCountdown)}</span>
                </div>
                <button onClick={handleCryptoConfirm} disabled={loading} style={primaryBtn(loading)}>
                  {loading ? <><span className="spinner" />...</> : (lang === 'es' ? 'Ya transferí, continuar →' : 'Already sent, continue →')}
                </button>
              </div>
            )}
            {error && <ErrorBox msg={error} />}
          </div>
        )}

        {/* ── Transfer ── */}
        {activeTab === 'transfer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
              {lang === 'es' ? 'Transferencia bancaria' : 'Bank Transfer'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {lang === 'es' ? 'Transfiere el monto exacto y sube el comprobante.' : 'Transfer the exact amount and upload your receipt.'}
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
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{voucherFile.name}</div>
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
              {loading ? <><span className="spinner" />{lang === 'es' ? 'Enviando...' : 'Sending...'}</> : (lang === 'es' ? 'Enviar comprobante y continuar' : 'Send receipt and continue')}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={() => router.push('/checkout/contract')}
          style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
      {msg}
    </div>
  )
}
