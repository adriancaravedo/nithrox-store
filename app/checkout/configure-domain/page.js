'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/shared/Header'
import CheckoutProgress from '@/components/shared/CheckoutProgress'
import { useCheckoutStore } from '@/store/checkout'
import { useTranslation } from '@/lib/i18n'
import { formatPrice } from '@/lib/data'

const TLDS = [
  { ext: '.com',   price_pen: 0,  free_kit: true  },
  { ext: '.pe',    price_pen: 0,  free_kit: true  },
  { ext: '.net',   price_pen: 59, free_kit: false },
  { ext: '.org',   price_pen: 49, free_kit: false },
  { ext: '.store', price_pen: 89, free_kit: false },
]

export default function ConfigureDomainPage() {
  const router = useRouter()
  const { lang, currency, plan, domain, setDomain } = useCheckoutStore()
  const tr = useTranslation(lang)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [checking, setChecking] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState(domain?.full || '')

  const isKitDigital = plan?.id === 'kit-digital'

  const checkAvailability = useCallback(async (name) => {
    if (!name || name.length < 2) { setResults([]); return }
    setChecking(true)
    const checks = await Promise.all(
      TLDS.map(async (tld) => {
        const full = `${name}${tld.ext}`
        try {
          const res = await fetch(`/api/domains/check?domain=${encodeURIComponent(full)}`)
          const data = await res.json()
          return { ...tld, full, available: data.available }
        } catch {
          return { ...tld, full, available: true }
        }
      })
    )
    setResults(checks)
    setChecking(false)
  }, [])

  function handleSearch(e) {
    e.preventDefault()
    const name = query.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (!name) return
    setQuery(name)
    checkAvailability(name)
  }

  function handleSelect(item) {
    setSelectedDomain(item.full)
    setDomain({
      full: item.full,
      name: query,
      tld: item.ext,
      price_pen: (isKitDigital && item.free_kit) ? 0 : item.price_pen,
      free: isKitDigital && item.free_kit,
    })
  }

  function handleContinue() {
    router.push('/checkout/addons')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CheckoutProgress current="configure-domain" />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <div className="text-center mb-10 fade-up">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--ntx-orange)] mb-2">
            {lang === 'es' ? 'Paso 3' : 'Step 3'}
          </p>
          <h1 className="text-4xl font-black text-[var(--ntx-dark)]">{tr('domain.title')}</h1>
          <p className="text-gray-500 mt-2">{tr('domain.subtitle')}</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-[24px] border border-[var(--ntx-border)] p-6 mb-6 fade-up" style={{ animationDelay: '80ms' }}>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={tr('domain.search')}
                className="w-full px-4 py-3.5 rounded-xl border border-[var(--ntx-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ntx-orange)]/30 focus:border-[var(--ntx-orange)] transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">.com</span>
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 bg-[var(--ntx-dark)] text-white font-bold rounded-xl text-sm hover:opacity-80 transition-all whitespace-nowrap"
            >
              {lang === 'es' ? 'Buscar' : 'Search'}
            </button>
          </form>
        </div>

        {/* Results */}
        {checking && (
          <div className="text-center text-gray-500 text-sm py-6 fade-in">
            <div className="inline-block w-5 h-5 border-2 border-[var(--ntx-orange)] border-t-transparent rounded-full animate-spin mr-2" />
            {tr('domain.checking')}
          </div>
        )}

        {!checking && results.length > 0 && (
          <div className="flex flex-col gap-3 fade-up">
            {results.map((item) => {
              const isSelected = selectedDomain === item.full
              const isFree = isKitDigital && item.free_kit
              return (
                <div
                  key={item.ext}
                  className={`bg-white rounded-[20px] border-2 p-5 flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-[var(--ntx-orange)] shadow-md shadow-orange-100'
                      : 'border-[var(--ntx-border)] hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="font-bold text-[var(--ntx-dark)]">{query}</span>
                      <span className="text-[var(--ntx-orange)] font-bold">{item.ext}</span>
                    </div>
                    {/* Status chip */}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {item.available ? tr('domain.available') : tr('domain.taken')}
                    </span>
                    {isFree && item.available && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-[var(--ntx-orange)]">
                        🎁 {tr('domain.free_first_year')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {isFree ? (
                        <div>
                          <span className="text-xs line-through text-gray-300">{formatPrice(item.price_pen || 59, currency)}</span>
                          <p className="text-sm font-black text-green-600">{lang === 'es' ? 'Gratis' : 'Free'}</p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-[var(--ntx-dark)]">
                          {formatPrice(item.price_pen, currency)}<span className="text-xs text-gray-400">{lang === 'es' ? '/año' : '/year'}</span>
                        </p>
                      )}
                    </div>
                    <button
                      disabled={!item.available}
                      onClick={() => item.available && handleSelect(item)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-green-500 text-white'
                          : item.available
                            ? 'bg-[var(--ntx-orange)] text-white hover:opacity-90'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSelected ? tr('domain.added') : item.available ? tr('domain.add') : tr('domain.taken')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Selected summary */}
        {selectedDomain && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-[20px] p-4 flex items-center gap-3 fade-in">
            <span className="text-2xl">🌐</span>
            <div>
              <p className="text-xs text-green-600 font-semibold">{lang === 'es' ? 'Dominio seleccionado' : 'Selected domain'}</p>
              <p className="font-black text-[var(--ntx-dark)]">{selectedDomain}</p>
            </div>
          </div>
        )}

        {/* Continue */}
        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            ← {tr('checkout.back')}
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedDomain}
            className="px-8 py-3.5 bg-[var(--ntx-orange)] text-white font-bold rounded-full hover:opacity-90 active:scale-95 transition-all shadow-md shadow-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {tr('checkout.next')} →
          </button>
        </div>
      </div>
    </div>
  )
}
