import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCheckoutStore = create(
  persist(
    (set, get) => ({
      // Selected plan
      plan: null,
      setPlan: (plan) => set({ plan, addons: [], hosting: null, domain: null }),

      // Hosting config (for kit-digital)
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

      // Contract signature
      signatureDataUrl: null,
      setSignature: (dataUrl) => set({ signatureDataUrl: dataUrl }),
      signedAt: null,
      setSignedAt: (date) => set({ signedAt: date }),

      // Order
      orderId: null,
      setOrderId: (id) => set({ orderId: id }),

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

      // Computed total
      getTotal: () => {
        const { plan, addons, hosting, promoDiscount } = get()
        let total = plan ? plan.price_pen : 0
        addons.forEach(a => { total += a.price_pen })
        if (hosting && hosting.price_pen) total += hosting.price_pen
        if (promoDiscount > 0) total = total * (1 - promoDiscount / 100)
        return Math.round(total * 100) / 100
      },

      // Reset
      reset: () => set({
        plan: null, hosting: null, domain: null, addons: [],
        signatureDataUrl: null, signedAt: null, orderId: null,
        promoCode: null, promoDiscount: 0,
      }),
    }),
    { name: 'ntx-checkout', partialize: (s) => ({
      plan: s.plan, hosting: s.hosting, domain: s.domain,
      addons: s.addons, user: s.user, currency: s.currency, lang: s.lang,
    })}
  )
)
