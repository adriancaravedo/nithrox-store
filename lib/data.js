// ── Plans ─────────────────────────────────────────────────────
// These are the default values. The admin can override them in Supabase (store_config table).
export const DEFAULT_PLANS = [
  {
    id: 'kit-digital',
    name: 'Kit Digital',
    tagline: 'Para iniciar y descubrir Nithrox',
    price_pen: 149,
    billing: 'year',
    billing_label: { es: 'Un pago al año, no incluye IGV', en: 'One payment per year, tax not included' },
    color: '#E8441E',
    features: {
      es: [
        'No incluye desarrollo de website',
        'Almacena websites ilimitadas',
        'SSD NVMe ilimitado',
        'Databases limitado',
        'Recursos CPU & MEM Standard',
        'Dominio gratis 1er año',
        'Emails ilimitados',
        'Ancho de banda ilimitado',
        'Certificados SSL gratis e ilimitados',
        'Migración gratuita',
      ],
      en: [
        'Does not include website development',
        'Unlimited website storage',
        'Unlimited NVMe SSD',
        'Limited databases',
        'Standard CPU & MEM resources',
        'Free domain 1st year',
        'Unlimited emails',
        'Unlimited bandwidth',
        'Free unlimited SSL certificates',
        'Free migration',
      ],
    },
    // Kit Digital flow: hosting first, then domain, then addons (website offered there)
    flow: ['register', 'configure-hosting', 'configure-domain', 'addons', 'cart', 'contract', 'payment'],
    hosting_required: true,
    domain_required: true,
    website_in_addons: true,
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'Cosa seria, pero ya estás en las ligas',
    price_pen: 699,
    billing: 'once',
    billing_label: { es: 'Un solo pago, no incluye IGV', en: 'One-time payment, tax not included' },
    color: '#E8441E',
    features: {
      es: [
        'Incluye Kit Digital',
        'Diseño UX/UI a medida',
        'Desarrollo en 4 fases',
        'Hasta 10 páginas',
        'SEO estándar',
        'Integraciones API',
        'Widgets',
        'Lista en 15 días',
        'Inicia con el 25%',
      ],
      en: [
        'Includes Kit Digital',
        'Custom UX/UI design',
        'Development in 4 phases',
        'Up to 10 pages',
        'Standard SEO',
        'API integrations',
        'Widgets',
        'Ready in 15 days',
        'Starts with 25%',
      ],
    },
    flow: ['register', 'addons', 'cart', 'contract', 'payment'],
    hosting_required: false,
    domain_required: false,
    website_in_addons: false,
  },
  {
    id: 'ecommerce',
    name: 'Ecommerce',
    tagline: 'Vende como nosotros lo hacemos',
    price_pen: 1499,
    billing: 'once',
    billing_label: { es: 'Un solo pago, no incluye IGV', en: 'One-time payment, tax not included' },
    color: '#E8441E',
    features: {
      es: [
        'Incluye Kit Digital',
        'Diseño UX/UI a medida',
        'Desarrollo en 4 fases',
        'Hasta 20 páginas',
        'SEO avanzado',
        'Integraciones API',
        'Integración de Ecommerce Apps',
        'Lista en 25 días',
        'Inicia con el 25%',
        'Integración pasarelas de pago',
      ],
      en: [
        'Includes Kit Digital',
        'Custom UX/UI design',
        'Development in 4 phases',
        'Up to 20 pages',
        'Advanced SEO',
        'API integrations',
        'Ecommerce App integrations',
        'Ready in 25 days',
        'Starts with 25%',
        'Payment gateway integration',
      ],
    },
    flow: ['register', 'addons', 'cart', 'contract', 'payment'],
    hosting_required: false,
    domain_required: false,
    website_in_addons: false,
  },
]

// ── Addons ────────────────────────────────────────────────────
export const DEFAULT_ADDONS = [
  {
    id: 'email-pro',
    name: { es: 'Email Profesional', en: 'Professional Email' },
    description: { es: 'Correos corporativos con tu dominio', en: 'Corporate emails with your domain' },
    price_pen: 79,
    billing: 'year',
    free: false,
    icon: '📧',
    available_for: ['kit-digital', 'business', 'ecommerce'],
  },
  {
    id: 'seo-advanced',
    name: { es: 'SEO Avanzado', en: 'Advanced SEO' },
    description: { es: 'Posicionamiento premium en Google', en: 'Premium Google positioning' },
    price_pen: 299,
    billing: 'month',
    free: false,
    icon: '🔍',
    available_for: ['kit-digital', 'business', 'ecommerce'],
  },
  {
    id: 'maintenance',
    name: { es: 'Mantenimiento Mensual', en: 'Monthly Maintenance' },
    description: { es: 'Actualizaciones, backups y soporte técnico', en: 'Updates, backups and technical support' },
    price_pen: 149,
    billing: 'month',
    free: false,
    icon: '🔧',
    available_for: ['kit-digital', 'business', 'ecommerce'],
  },
  {
    id: 'logo-design',
    name: { es: 'Diseño de Logo', en: 'Logo Design' },
    description: { es: 'Identidad visual profesional', en: 'Professional visual identity' },
    price_pen: 199,
    billing: 'once',
    free: false,
    icon: '🎨',
    available_for: ['kit-digital', 'business', 'ecommerce'],
  },
  {
    id: 'social-media',
    name: { es: 'Gestión de Redes Sociales', en: 'Social Media Management' },
    description: { es: '4 publicaciones semanales + estrategia', en: '4 weekly posts + strategy' },
    price_pen: 249,
    billing: 'month',
    free: false,
    icon: '📱',
    available_for: ['kit-digital', 'business', 'ecommerce'],
  },
  {
    id: 'website',
    name: { es: 'Desarrollo de Website', en: 'Website Development' },
    description: { es: 'Sitio web profesional de hasta 5 páginas', en: 'Professional website up to 5 pages' },
    price_pen: 499,
    billing: 'once',
    free: false,
    icon: '🌐',
    available_for: ['kit-digital'], // only offered as addon for Kit Digital
    kit_digital_only: true,
  },
]

// ── Hosting tiers (20i) ───────────────────────────────────────
export const HOSTING_TIERS = [
  {
    id: 'starter',
    name: { es: 'Starter', en: 'Starter' },
    disk: '10 GB',
    emails: 10,
    databases: 3,
    price_pen: 0, // included in plan
    recommended_for: ['kit-digital'],
  },
  {
    id: 'pro',
    name: { es: 'Pro', en: 'Pro' },
    disk: '50 GB',
    emails: 50,
    databases: 10,
    price_pen: 49,
    recommended_for: ['business'],
  },
  {
    id: 'business',
    name: { es: 'Business', en: 'Business' },
    disk: '200 GB',
    emails: 999,
    databases: 30,
    price_pen: 99,
    recommended_for: ['ecommerce'],
  },
]

// ── Payment methods ───────────────────────────────────────────
export const PAYMENT_METHODS = [
  { id: 'stripe',      label: 'Tarjeta',         icon: '💳', auto: true },
  { id: 'izipay',      label: 'Izipay',          icon: '🏦', auto: true },
  { id: 'paypal',      label: 'PayPal',          icon: '🅿️', auto: true },
  { id: 'nowpayments', label: 'Cripto',          icon: '₿',  auto: true  },
  { id: 'transfer',    label: 'Transferencia',   icon: '🏧', auto: false },
]

// ── Exchange rate ─────────────────────────────────────────────
export const PEN_TO_USD = parseFloat(process.env.NEXT_PUBLIC_PEN_TO_USD_RATE || '3.7')
export function toUSD(pen) { return (pen / PEN_TO_USD).toFixed(2) }
export function formatPrice(pen, currency = 'PEN') {
  if (currency === 'USD') return `$${toUSD(pen)}`
  return `S/ ${pen.toLocaleString('es-PE')}`
}
