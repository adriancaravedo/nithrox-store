import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCheckoutStore = create(
  persist(
    (set, get) => ({
      // Selected plan
      plan: null,
      setPlan: (plan) => set({ plan, addons: [], hosting: null, domain: null, customization: null }),

      // Plan customization (step 3 — only for Corporativa / Ecommerce)
      customization: null,
      setCustomization: (c) => set({ customization: c }),

      // Hosting config
      hosting: null,
      setHosting: (hosting) => set({ hosting }),

      // Domain config
      domain: null,
      setDomain: (domain) => set({ domain }),

      // Selected addons
      addons: [],
      toggleAddon: (addon) => set(s => ({
        addons: s.addons.find(a => a.id === addon.id)
          ? s.addons.filter(a => a.id !== addon.id)
          : [...s.addons, addon],
      })),

      // User/account
      user: null,
      setUser: (user) => set({ user }),

      // Contract fields (DocuSign-level)
      signatureDataUrl: null,
      setSignature: (dataUrl) => set({ signatureDataUrl: dataUrl }),
      signedAt: null,
      setSignedAt: (date) => set({ signedAt: date }),
      signerFullName: '',
      setSignerFullName: (n) => set({ signerFullName: n }),
      signerDni: '',
      setSignerDni: (d) => set({ signerDni: d }),
      contractNumber: null,
      setContractNumber: (n) => set({ contractNumber: n }),
      signerIp: null,
      setSignerIp: (ip) => set({ signerIp: ip }),

      // Kit Digital free month offer
      kitDigitalOfferAccepted: false,
      setKitDigitalOffer: (v) => set({ kitDigitalOfferAccepted: v }),

      // Order
      orderId: null,
      setOrderId: (id) => set({ orderId: id }),

      // Payment method used (for thanks page)
      paymentMethod: null,
      setPaymentMethod: (m) => set({ paymentMethod: m }),

      // Currency
      currency: 'PEN',
      setCurrency: (c) => set({ currency: c }),

      // Language
      lang: 'es',
      setLang: (l) => set({ lang: l }),

      // Promo code
      promoCode: null,
      promoDiscount: 0,
      applyPromo: (code, discount) => set({ promoCode: code, promoDiscount: discount }),

      // Computed total (full plan price)
      getTotal: () => {
        const { plan, addons, hosting, promoDiscount, customization, kitDigitalOfferAccepted } = get()
        // Kit Digital free first month
        if (plan?.id === 'kit-digital' && kitDigitalOfferAccepted) return 0
        let total = plan ? plan.price_pen : 0
        // Page extra cost for Corporativa/Ecommerce
        if (customization?.pagesExtra) total += customization.pagesExtra
        addons.forEach(a => { total += a.price_pen })
        if (hosting && !hosting._noHosting && hosting.price_pen) total += hosting.price_pen
        if (promoDiscount > 0) total = total * (1 - promoDiscount / 100)
        return Math.round(total * 100) / 100
      },

      // First payment amount (10% for phased plans, full for Kit Digital)
      getFirstPayment: () => {
        const { plan, getTotal } = get()
        const total = getTotal()
        if (!plan || !plan.payment_schedule) return total
        const first = plan.payment_schedule[0]
        return Math.round(total * first.pct / 100 * 100) / 100
      },

      // Save progress to Supabase (and localStorage via persist)
      saveProgress: async () => {
        const s = get()
        const payload = {
          user_id: s.user?.id || null,
          state: {
            plan:          s.plan,
            hosting:       s.hosting,
            domain:        s.domain,
            addons:        s.addons,
            customization: s.customization,
            currency:      s.currency,
            lang:          s.lang,
            promoCode:     s.promoCode,
            promoDiscount: s.promoDiscount,
          },
        }
        const res = await fetch('/api/orders/save-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to save progress')
        return res.json()
      },

      // Load progress from Supabase for a logged-in user
      loadProgress: async (userId) => {
        if (!userId) return
        try {
          const res  = await fetch(`/api/orders/save-draft?user_id=${encodeURIComponent(userId)}`)
          const data = await res.json()
          if (data.draft) {
            set(state => ({ ...state, ...data.draft }))
          }
        } catch {
          // silent — localStorage already has data
        }
      },

      // Reset
      reset: () => set({
        plan: null, hosting: null, domain: null, addons: [],
        customization: null,
        signatureDataUrl: null, signedAt: null, orderId: null,
        signerFullName: '', signerDni: '', contractNumber: null, signerIp: null,
        paymentMethod: null,
        promoCode: null, promoDiscount: 0,
        kitDigitalOfferAccepted: false,
      }),
    }),
    {
      name: 'ntx-checkout',
      partialize: (s) => ({
        plan:          s.plan,
        hosting:       s.hosting,
        domain:        s.domain,
        addons:        s.addons,
        customization: s.customization,
        user:          s.user,
        currency:      s.currency,
        lang:          s.lang,
        promoCode:     s.promoCode,
        promoDiscount: s.promoDiscount,
        contractNumber: s.contractNumber,
        signerFullName: s.signerFullName,
        signerDni:     s.signerDni,
        orderId:       s.orderId,
        paymentMethod: s.paymentMethod,
        kitDigitalOfferAccepted: s.kitDigitalOfferAccepted,
      }),
    }
  )
)
