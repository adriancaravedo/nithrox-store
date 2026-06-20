'use client'
import { Check } from 'lucide-react'
import { useCheckoutStore } from '@/store/checkout'

const STEPS_BY_PLAN = {
  'kit-digital': [
    { id: 'plan', label: { es: 'Plan', en: 'Plan' } },
    { id: 'register', label: { es: 'Cuenta', en: 'Account' } },
    { id: 'configure-hosting', label: { es: 'Hosting', en: 'Hosting' } },
    { id: 'configure-domain', label: { es: 'Dominio', en: 'Domain' } },
    { id: 'addons', label: { es: 'Extras', en: 'Add-ons' } },
    { id: 'cart', label: { es: 'Pedido', en: 'Order' } },
    { id: 'contract', label: { es: 'Contrato', en: 'Contract' } },
    { id: 'payment', label: { es: 'Pago', en: 'Payment' } },
  ],
  default: [
    { id: 'plan', label: { es: 'Plan', en: 'Plan' } },
    { id: 'register', label: { es: 'Cuenta', en: 'Account' } },
    { id: 'addons', label: { es: 'Extras', en: 'Add-ons' } },
    { id: 'cart', label: { es: 'Pedido', en: 'Order' } },
    { id: 'contract', label: { es: 'Contrato', en: 'Contract' } },
    { id: 'payment', label: { es: 'Pago', en: 'Payment' } },
  ],
}

export default function CheckoutProgress({ current }) {
  const { plan, lang } = useCheckoutStore()
  const steps = plan?.id === 'kit-digital' ? STEPS_BY_PLAN['kit-digital'] : STEPS_BY_PLAN.default
  const currentIdx = steps.findIndex(s => s.id === current)

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-5">
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isDone = i < currentIdx
          const isActive = i === currentIdx
          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-[var(--ntx-orange)] text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {isDone ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-[9px] font-semibold whitespace-nowrap hidden sm:block
                  ${isActive ? 'text-[var(--ntx-orange)]' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                  {step.label[lang] || step.label.es}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1.5 mb-4 transition-all ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
