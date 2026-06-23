// ── Plans ─────────────────────────────────────────────────────
// Default values. Admin can override in Supabase (store_config table).
export const DEFAULT_PLANS = [
  {
    id: 'kit-digital',
    name: 'Kit Digital',
    tagline: 'Tu presencia digital garantizada',
    price_pen: 149,
    billing: 'year',
    billing_label: { es: 'Un pago al año · No incluye IGV', en: 'One payment per year · Tax not included' },
    color: '#E8441E',
    customize_step: false,
    hosting_required: true,
    domain_required: true,
    website_in_addons: true,
    kit_digital_offer: true,
    payment_schedule: null,
    base_pages: null,
    page_options: null,
    features: {
      es: [
        'No incluye desarrollo de website',
        'Hosting SSD NVMe ilimitado',
        'Dominio gratis el 1er año',
        'Emails corporativos ilimitados',
        'Ancho de banda ilimitado',
        'Certificados SSL gratuitos',
        'Bases de datos incluidas',
        'Panel de control cPanel',
        'Migración gratuita incluida',
        'Soporte técnico prioritario',
      ],
      en: [
        'Does not include website development',
        'Unlimited NVMe SSD hosting',
        'Free domain 1st year',
        'Unlimited corporate emails',
        'Unlimited bandwidth',
        'Free SSL certificates',
        'Included databases',
        'cPanel control panel',
        'Free migration included',
        'Priority technical support',
      ],
    },
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
    available_for: ['kit-digital', 'corporativa', 'ecommerce'],
  },
  {
    id: 'seo-advanced',
    name: { es: 'SEO Avanzado', en: 'Advanced SEO' },
    description: { es: 'Posicionamiento premium en Google', en: 'Premium Google positioning' },
    price_pen: 299,
    billing: 'month',
    free: false,
    icon: '🔍',
    available_for: ['kit-digital', 'corporativa', 'ecommerce'],
  },
  {
    id: 'maintenance',
    name: { es: 'Mantenimiento Mensual', en: 'Monthly Maintenance' },
    description: { es: 'Actualizaciones, backups y soporte técnico', en: 'Updates, backups and technical support' },
    price_pen: 149,
    billing: 'month',
    free: false,
    icon: '🔧',
    available_for: ['kit-digital', 'corporativa', 'ecommerce'],
  },
  {
    id: 'logo-design',
    name: { es: 'Diseño de Logo', en: 'Logo Design' },
    description: { es: 'Identidad visual profesional', en: 'Professional visual identity' },
    price_pen: 199,
    billing: 'once',
    free: false,
    icon: '🎨',
    available_for: ['kit-digital', 'corporativa', 'ecommerce'],
  },
  {
    id: 'social-media',
    name: { es: 'Gestión de Redes Sociales', en: 'Social Media Management' },
    description: { es: '4 publicaciones semanales + estrategia', en: '4 weekly posts + strategy' },
    price_pen: 249,
    billing: 'month',
    free: false,
    icon: '📱',
    available_for: ['kit-digital', 'corporativa', 'ecommerce'],
  },
  {
    id: 'website',
    name: { es: 'Desarrollo de Website', en: 'Website Development' },
    description: { es: 'Sitio web profesional de hasta 5 páginas', en: 'Professional website up to 5 pages' },
    price_pen: 499,
    billing: 'once',
    free: false,
    icon: '🌐',
    available_for: ['kit-digital'],
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
    price_pen: 0,
    recommended_for: ['kit-digital'],
  },
  {
    id: 'pro',
    name: { es: 'Pro', en: 'Pro' },
    disk: '50 GB',
    emails: 50,
    databases: 10,
    price_pen: 49,
    recommended_for: ['corporativa'],
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
  { id: 'nowpayments', label: 'Cripto',          icon: '₿',  auto: false },
  { id: 'transfer',    label: 'Transferencia',   icon: '🏧', auto: false },
]

// ── Exchange rate ─────────────────────────────────────────────
export const PEN_TO_USD = parseFloat(process.env.NEXT_PUBLIC_PEN_TO_USD_RATE || '3.7')
export function toUSD(pen) { return (pen / PEN_TO_USD).toFixed(2) }
export function formatPrice(pen, currency = 'PEN') {
  if (currency === 'USD') return `$${toUSD(pen)}`
  return `S/ ${pen.toLocaleString('es-PE')}`
}

// Returns the amount due NOW (first payment for phased plans)
export function getFirstPaymentAmount(plan, total) {
  if (!plan || !plan.payment_schedule) return total
  const firstPhase = plan.payment_schedule[0]
  return Math.round(total * firstPhase.pct / 100 * 100) / 100
}
