'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import CheckoutProgress from '@/components/shared/CheckoutProgress'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'

const TABS = [
  { id: 'stripe',    label: 'Tarjeta',       icon: '💳' },
  { id: 'izipay',   label: 'Izipay',         icon: '🏦' },
  { id: 'paypal',   label: 'PayPal',         icon: '🅿️' },
  { id: 'crypto',   label: 'Cripto',         icon: '₿'  },
  { id: 'transfer', label: 'Transferencia',  icon: '🏧' },
]

const CRYPTOS = [
  { id: 'btc',  name: 'Bitcoin',  symbol: 'BTC', icon: '₿'   },
  { id: 'eth',  name: 'Ethereum', symbol: 'ETH', icon: 'Ξ'   },
  { id: 'usdt', name: 'USDT',     symbol: 'USDT', icon: '₮'  },
  { id: 'sol',  name: 'Solana',   symbol: 'SOL', icon: '◎'   },
]

export default function PaymentPage() {
  const router = useRouter()
  const { lang, currency, plan, addons, hosting, domain, user, signatureDataUrl, getTotal, setOrderId } = useCheckoutStore()
  const tr = useTranslation(lang)

  const [activeTab, setActiveTab] = useState('stripe')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Stripe
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' })

  // Crypto
  const [selectedCrypto, setSelectedCrypto] = useState(null)
  const [cryptoPayment, setCryptoPayment] = useState(null)
  const [waitingCrypto, setWaitingCrypto] = useState(false)

  // Transfer
  const [voucherFile, setVoucherFile] = useState(null)
  const fileRef = useRef()

  const total = getTotal()

  async function createOrder(paymentMethod, extraData = {}) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: plan?.id,
        plan_name: plan?.name,
        plan_price: plan?.price_pen,
        addons,
        hosting,
        domain,
        user_id: user?.id,
        signature_data_url: signatureDataUrl,
        payment_method: paymentMethod,
        total_pen: total,
        currency,
        lang,
        ...extraData,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error creating order')
    return data.orderId
  }

  // ── Stripe ──────────────────────────────────────────────────────
  function formatCardNumber(val) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }
  function formatExpiry(val) {
    const clean = val.replace(/\D/g, '').slice(0, 4)
    if (clean.length > 2) return clean.slice(0, 2) + '/' + clean.slice(2)
    return clean
  }

  async function handleStripeSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const piRes = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: total, currency, order_id: 'pending', customer_email: user?.email }),
      })
      const piData = await piRes.json()

      const orderId = await createOrder('stripe', { payment_id: piData.clientSecret })
      setOrderId(orderId)
      router.push(`/order/${orderId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Izipay ──────────────────────────────────────────────────────
  async function handleIzipay() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/izipay/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: total, customer_email: user?.email }),
      })
      const data = await res.json()
      const orderId = await createOrder('izipay')
      setOrderId(orderId)
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        router.push(`/order/${orderId}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── PayPal ──────────────────────────────────────────────────────
  async function handlePayPal() {
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: total, currency }),
      })
      const data = await res.json()
      const orderId = await createOrder('paypal', { payment_id: data.id })
      setOrderId(orderId)
      if (data.approvalUrl) {
        window.location.href = data.approvalUrl
      } else {
        router.push(`/order/${orderId}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Crypto ──────────────────────────────────────────────────────
  async function handleCryptoSelect(crypto) {
    setSelectedCrypto(crypto)
    setCryptoPayment(null)
    setWaitingCrypto(false)
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/nowpayments/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_pen: total, currency_code: crypto.id, order_id: 'pending' }),
      })
      const data = await res.json()
      setCryptoPayment(data)
      setWaitingCrypto(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCryptoConfirm() {
    setLoading(true)
    try {
      const orderId = await createOrder('crypto', { payment_id: cryptoPayment.payment_id })
      setOrderId(orderId)
      router.push(`/order/${orderId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Transfer ────────────────────────────────────────────────────
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
      formData.append('amount', total)
      formData.append('currency', currency)

      await fetch('/api/orders/submit-transfer', { method: 'POST', body: formData })
      const orderId = await createOrder('transfer')
      setOrderId(orderId)
      router.push(`/order/${orderId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CheckoutProgress current="payment" />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="text-center mb-8 fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ntx-orange)] mb-2">
            {lang === 'es' ? 'Último paso' : 'Last step'}
          </p>
          <h1 className="text-4xl font-black text-[var(--ntx-dark)]">{tr('payment.title')}</h1>
          <div className="inline-flex items-center gap-2 mt-3 bg-[var(--ntx-dark)] text-white rounded-full px-5 py-2 text-sm font-bold">
            <span className="text-[var(--ntx-orange)]">{lang === 'es' ? 'Total:' : 'Total:'}</span>
            {formatPrice(total, currency)}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 fade-up" style={{ animationDelay: '80ms' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError('') }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--ntx-dark)] text-white shadow-md'
                  : 'bg-white border border-[var(--ntx-border)] text-gray-500 hover:border-gray-400'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div className="bg-white rounded-[24px] border border-[var(--ntx-border)] p-7 fade-up" style={{ animationDelay: '120ms' }}>

          {/* ── Stripe ── */}
          {activeTab === 'stripe' && (
            <form onSubmit={handleStripeSubmit} className="flex flex-col gap-4">
              <h2 className="font-black text-[var(--ntx-dark)] text-lg mb-1">{tr('payment.stripe_title')}</h2>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{lang === 'es' ? 'Nombre en la tarjeta' : 'Name on card'}</label>
                <input
                  type="text"
                  required
                  value={card.name}
                  onChange={e => setCard(c => ({ ...c, name: e.target.value }))}
                  placeholder="Juan García"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{lang === 'es' ? 'Número de tarjeta' : 'Card number'}</label>
                <input
                  type="text"
                  required
                  value={card.number}
                  onChange={e => setCard(c => ({ ...c, number: formatCardNumber(e.target.value) }))}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all tracking-widest"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">MM/AA</label>
                  <input
                    type="text"
                    required
                    value={card.expiry}
                    onChange={e => setCard(c => ({ ...c, expiry: formatExpiry(e.target.value) }))}
                    placeholder="12/27"
                    maxLength={5}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">CVC</label>
                  <input
                    type="text"
                    required
                    value={card.cvc}
                    onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--ntx-border)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[var(--ntx-orange)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 mt-2"
              >
                {loading ? (lang === 'es' ? 'Procesando...' : 'Processing...') : `${tr('payment.pay')} ${formatPrice(total, currency)}`}
              </button>
            </form>
          )}

          {/* ── Izipay ── */}
          {activeTab === 'izipay' && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="w-20 h-20 bg-blue-50 rounded-[20px] flex items-center justify-center text-4xl">🏦</div>
              <div className="text-center">
                <h2 className="font-black text-[var(--ntx-dark)] text-lg">{tr('payment.izipay_title')}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {lang === 'es' ? 'Serás redirigido a la pasarela de Izipay para completar tu pago de forma segura.' : 'You will be redirected to Izipay to complete your payment securely.'}
                </p>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 w-full">{error}</p>}
              <button
                onClick={handleIzipay}
                disabled={loading}
                className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                {loading ? (lang === 'es' ? 'Redirigiendo...' : 'Redirecting...') : `${lang === 'es' ? 'Pagar con Izipay' : 'Pay with Izipay'} — ${formatPrice(total, currency)}`}
              </button>
            </div>
          )}

          {/* ── PayPal ── */}
          {activeTab === 'paypal' && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="w-20 h-20 bg-blue-50 rounded-[20px] flex items-center justify-center text-4xl">🅿️</div>
              <div className="text-center">
                <h2 className="font-black text-[var(--ntx-dark)] text-lg">{tr('payment.paypal_title')}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {lang === 'es' ? 'Paga de forma rápida y segura con tu cuenta PayPal.' : 'Pay quickly and securely with your PayPal account.'}
                </p>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 w-full">{error}</p>}
              <button
                onClick={handlePayPal}
                disabled={loading}
                className="w-full py-3.5 bg-[#0070BA] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                {loading ? '...' : `PayPal — ${formatPrice(total, currency)}`}
              </button>
            </div>
          )}

          {/* ── Crypto ── */}
          {activeTab === 'crypto' && (
            <div className="flex flex-col gap-5">
              <h2 className="font-black text-[var(--ntx-dark)] text-lg">{tr('payment.crypto_title')}</h2>
              {!cryptoPayment ? (
                <>
                  <p className="text-sm text-gray-500">{lang === 'es' ? 'Selecciona tu criptomoneda preferida:' : 'Select your preferred cryptocurrency:'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {CRYPTOS.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCryptoSelect(c)}
                        disabled={loading}
                        className={`flex items-center gap-3 p-4 rounded-[18px] border-2 text-left transition-all hover:border-[var(--ntx-orange)] hover:shadow-md disabled:opacity-60 ${
                          selectedCrypto?.id === c.id ? 'border-[var(--ntx-orange)] bg-orange-50' : 'border-[var(--ntx-border)]'
                        }`}
                      >
                        <span className="text-2xl font-black">{c.icon}</span>
                        <div>
                          <p className="font-bold text-sm text-[var(--ntx-dark)]">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.symbol}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {loading && (
                    <div className="text-center text-sm text-gray-500 py-4 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[var(--ntx-orange)] border-t-transparent rounded-full animate-spin" />
                      {lang === 'es' ? 'Generando dirección...' : 'Generating address...'}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--ntx-dark)] rounded-[20px] p-5 text-center">
                    {/* QR placeholder */}
                    <div className="w-32 h-32 bg-white rounded-xl mx-auto mb-3 flex items-center justify-center text-4xl">
                      {selectedCrypto?.icon}
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{lang === 'es' ? 'Dirección de pago' : 'Payment address'}</p>
                    <p className="text-white font-mono text-xs break-all">{cryptoPayment.pay_address}</p>
                  </div>
                  <div className="flex justify-between items-center bg-orange-50 rounded-[16px] px-4 py-3 border border-orange-100">
                    <span className="text-sm text-gray-600">{lang === 'es' ? 'Monto a enviar' : 'Amount to send'}</span>
                    <span className="font-black text-[var(--ntx-dark)]">{cryptoPayment.pay_amount} {cryptoPayment.pay_currency?.toUpperCase()}</span>
                  </div>
                  {waitingCrypto && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 justify-center py-2">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 bg-[var(--ntx-orange)] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                      {lang === 'es' ? 'Esperando confirmación...' : 'Waiting for confirmation...'}
                    </div>
                  )}
                  <button
                    onClick={handleCryptoConfirm}
                    disabled={loading}
                    className="w-full py-3.5 bg-[var(--ntx-orange)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {loading ? '...' : (lang === 'es' ? 'Ya transferí, continuar' : 'Already transferred, continue')}
                  </button>
                </div>
              )}
              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
            </div>
          )}

          {/* ── Transfer ── */}
          {activeTab === 'transfer' && (
            <div className="flex flex-col gap-5">
              <h2 className="font-black text-[var(--ntx-dark)] text-lg">{tr('payment.transfer_title')}</h2>
              <p className="text-sm text-gray-500">{tr('payment.transfer_instructions')}</p>

              <div className="bg-gray-50 rounded-[20px] border border-[var(--ntx-border)] p-5 flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{tr('payment.bank')}</span>
                  <span className="font-bold text-[var(--ntx-dark)]">BCP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{tr('payment.account')}</span>
                  <span className="font-mono font-bold text-[var(--ntx-dark)]">193-24521234-0-89</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{tr('payment.cci')}</span>
                  <span className="font-mono font-bold text-[var(--ntx-dark)]">002-193-002452123489-13</span>
                </div>
                <hr className="border-[var(--ntx-border)]" />
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium text-sm">{lang === 'es' ? 'Monto exacto' : 'Exact amount'}</span>
                  <span className="font-black text-[var(--ntx-orange)] text-lg">{formatPrice(total, 'PEN')}</span>
                </div>
              </div>

              {/* Voucher upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">{tr('payment.upload_voucher')}</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-[var(--ntx-border)] rounded-[20px] p-8 text-center cursor-pointer hover:border-[var(--ntx-orange)] transition-all"
                >
                  {voucherFile ? (
                    <div>
                      <span className="text-2xl">📄</span>
                      <p className="text-sm font-bold text-green-600 mt-1">{voucherFile.name}</p>
                      <p className="text-xs text-gray-400">({(voucherFile.size / 1024).toFixed(0)} KB)</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl">📤</span>
                      <p className="text-sm text-gray-500 mt-2">{lang === 'es' ? 'Haz clic o arrastra tu comprobante aquí' : 'Click or drag your receipt here'}</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF (max 5 MB)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => setVoucherFile(e.target.files[0] || null)}
                />
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

              <button
                onClick={handleTransferSubmit}
                disabled={loading || !voucherFile}
                className="w-full py-3.5 bg-[var(--ntx-dark)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? (lang === 'es' ? 'Enviando...' : 'Sending...') : (lang === 'es' ? 'Enviar comprobante y continuar' : 'Send receipt and continue')}
              </button>
            </div>
          )}
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← {tr('checkout.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
