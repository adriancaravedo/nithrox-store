'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { createClient } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'

// ── Country dial codes (comprehensive, Peru default) ─────────────────────────
const DIAL_CODES = [
  { code: '+51', flag: '🇵🇪', label: 'Perú' },
  { code: '+54', flag: '🇦🇷', label: 'Argentina' },
  { code: '+591', flag: '🇧🇴', label: 'Bolivia' },
  { code: '+55', flag: '🇧🇷', label: 'Brasil' },
  { code: '+56', flag: '🇨🇱', label: 'Chile' },
  { code: '+57', flag: '🇨🇴', label: 'Colombia' },
  { code: '+506', flag: '🇨🇷', label: 'Costa Rica' },
  { code: '+593', flag: '🇪🇨', label: 'Ecuador' },
  { code: '+503', flag: '🇸🇻', label: 'El Salvador' },
  { code: '+502', flag: '🇬🇹', label: 'Guatemala' },
  { code: '+504', flag: '🇭🇳', label: 'Honduras' },
  { code: '+52', flag: '🇲🇽', label: 'México' },
  { code: '+505', flag: '🇳🇮', label: 'Nicaragua' },
  { code: '+507', flag: '🇵🇦', label: 'Panamá' },
  { code: '+595', flag: '🇵🇾', label: 'Paraguay' },
  { code: '+1787', flag: '🇵🇷', label: 'Puerto Rico' },
  { code: '+809', flag: '🇩🇴', label: 'Rep. Dominicana' },
  { code: '+598', flag: '🇺🇾', label: 'Uruguay' },
  { code: '+58', flag: '🇻🇪', label: 'Venezuela' },
  { code: '+1', flag: '🇺🇸', label: 'EE.UU.' },
  { code: '+1', flag: '🇨🇦', label: 'Canadá' },
  { code: '+34', flag: '🇪🇸', label: 'España' },
  { code: '+44', flag: '🇬🇧', label: 'Reino Unido' },
  { code: '+49', flag: '🇩🇪', label: 'Alemania' },
  { code: '+33', flag: '🇫🇷', label: 'Francia' },
  { code: '+39', flag: '🇮🇹', label: 'Italia' },
  { code: '+31', flag: '🇳🇱', label: 'Países Bajos' },
  { code: '+351', flag: '🇵🇹', label: 'Portugal' },
  { code: '+7', flag: '🇷🇺', label: 'Rusia' },
  { code: '+86', flag: '🇨🇳', label: 'China' },
  { code: '+81', flag: '🇯🇵', label: 'Japón' },
  { code: '+82', flag: '🇰🇷', label: 'Corea del Sur' },
  { code: '+91', flag: '🇮🇳', label: 'India' },
  { code: '+61', flag: '🇦🇺', label: 'Australia' },
  { code: '+52', flag: '🇲🇽', label: 'México' },
  { code: '+27', flag: '🇿🇦', label: 'Sudáfrica' },
  { code: '+971', flag: '🇦🇪', label: 'Emiratos Árabes' },
  { code: '+20', flag: '🇪🇬', label: 'Egipto' },
  { code: '+234', flag: '🇳🇬', label: 'Nigeria' },
]

// Remove duplicates by (code + label)
const DIAL_CODES_UNIQUE = DIAL_CODES.filter((d, i, arr) =>
  arr.findIndex(x => x.code === d.code && x.label === d.label) === i
)

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const colors = ['var(--border)', 'var(--red)', '#F59E0B', '#3B82F6', 'var(--green)']
  const labels = ['', 'Muy débil', 'Débil', 'Buena', 'Fuerte']

  if (!password) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: score >= i ? colors[score] : 'var(--border)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[score], fontWeight: 600, marginTop: 4 }}>
        {labels[score]}
      </div>
    </div>
  )
}

function FieldError({ msg }) {
  if (!msg) return null
  return <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 5, fontWeight: 500 }}>{msg}</div>
}

function DialCodeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = DIAL_CODES_UNIQUE.find(d => d.code === value && (value !== '+1' || d.label === 'EE.UU.')) || DIAL_CODES_UNIQUE[0]
  const filtered = DIAL_CODES_UNIQUE.filter(d =>
    d.label.toLowerCase().includes(search.toLowerCase()) ||
    d.code.includes(search)
  )

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '12px 10px',
          border: '1.5px solid var(--border)',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          background: 'var(--surface)',
          color: 'var(--text)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          height: '100%',
          minWidth: 88,
        }}
      >
        <span style={{ fontSize: 16 }}>{selected.flag}</span>
        <span>{selected.code}</span>
        <ChevronDown size={12} style={{ color: 'var(--text-3)', marginLeft: 1 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => { setOpen(false); setSearch('') }} />
          <div style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            zIndex: 40,
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            width: 220,
            maxHeight: 260,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <input
                autoFocus
                type="text"
                placeholder="Buscar país..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
                  padding: '6px 10px', fontSize: 12, background: 'var(--bg)', color: 'var(--text)', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.map(d => (
                <button
                  key={`${d.code}-${d.label}`}
                  type="button"
                  onClick={() => { onChange(d.code); setOpen(false); setSearch('') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', border: 'none', background: value === d.code && selected.label === d.label ? 'rgba(232,68,30,0.06)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--text)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = value === d.code && selected.label === d.label ? 'rgba(232,68,30,0.06)' : 'transparent'}
                >
                  <span style={{ fontSize: 16 }}>{d.flag}</span>
                  <span style={{ flex: 1 }}>{d.label}</span>
                  <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{d.code}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const { lang, setUser, plan, saveProgress, sessionId } = useCheckoutStore()

  function nextStep() {
    return plan?.customize_step ? '/checkout/customize' : '/checkout/hosting'
  }
  const tr = useTranslation(lang)
  const [tab, setTab] = useState('register')

  // Register form
  const [reg, setReg] = useState({
    firstName: '', lastName: '', email: '',
    dialCode: '+51', phone: '', company: '',
    password: '', confirmPassword: '',
  })
  const [regErrors, setRegErrors] = useState({})
  const [regLoading, setRegLoading] = useState(false)
  const [regServerError, setRegServerError] = useState('')
  const [showRegPw, setShowRegPw] = useState(false)
  const [termsChecked, setTermsChecked] = useState(false)

  // Login form
  const [login, setLogin] = useState({ email: '', password: '' })
  const [loginErrors, setLoginErrors] = useState({})
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginServerError, setLoginServerError] = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)

  function validateReg() {
    const errs = {}
    if (!reg.firstName.trim()) errs.firstName = lang === 'es' ? 'Nombre requerido' : 'First name required'
    if (!reg.lastName.trim()) errs.lastName = lang === 'es' ? 'Apellidos requeridos' : 'Last name required'
    if (!reg.email.includes('@')) errs.email = lang === 'es' ? 'Email inválido' : 'Invalid email'
    if (!reg.phone.trim()) errs.phone = lang === 'es' ? 'Teléfono requerido' : 'Phone required'
    if (!reg.company.trim()) errs.company = lang === 'es' ? 'Empresa requerida' : 'Company required'
    if (reg.password.length < 8) errs.password = lang === 'es' ? 'Mínimo 8 caracteres' : 'Minimum 8 characters'
    if (reg.password !== reg.confirmPassword) errs.confirmPassword = lang === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match'
    if (!termsChecked) errs.terms = lang === 'es' ? 'Debes aceptar los términos' : 'You must accept the terms'
    setRegErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!validateReg()) return
    setRegLoading(true)
    setRegServerError('')
    const fullName = `${reg.firstName.trim()} ${reg.lastName.trim()}`
    const fullPhone = `${reg.dialCode}${reg.phone.trim()}`
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: reg.email,
        password: reg.password,
        options: { data: { full_name: fullName, phone: fullPhone, company: reg.company } },
      })
      if (error) { setRegServerError(error.message); return }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: fullName,
          email: reg.email,
        })
        setUser({ id: data.user.id, email: reg.email, name: fullName, phone: fullPhone, company: reg.company })

        // Save draft immediately so admin sees the registration even if user abandons checkout
        saveProgress?.('account').catch(() => {})

        fetch('/api/crm/sync-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            name: fullName,
            email: reg.email,
            phone: fullPhone,
            company: reg.company,
            source: 'Tienda Online',
          }),
        }).catch(() => {})
      }
      router.push(nextStep())
    } catch (err) {
      setRegServerError(err.message || (lang === 'es' ? 'Error al crear la cuenta' : 'Error creating account'))
    } finally {
      setRegLoading(false)
    }
  }

  function validateLogin() {
    const errs = {}
    if (!login.email.includes('@')) errs.email = lang === 'es' ? 'Email inválido' : 'Invalid email'
    if (!login.password) errs.password = lang === 'es' ? 'Contraseña requerida' : 'Password required'
    setLoginErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!validateLogin()) return
    setLoginLoading(true)
    setLoginServerError('')
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email: login.email, password: login.password })
      if (error) { setLoginServerError(error.message); return }
      const user = data.user
      const { data: profile } = await supabase.from('profiles').select('name, phone, company').eq('id', user.id).single()
      setUser({ id: user.id, email: user.email, name: profile?.name || user.email, phone: profile?.phone || null, company: profile?.company || null })
      saveProgress?.('account').catch(() => {})
      router.push(nextStep())
    } catch (err) {
      setLoginServerError(err.message || (lang === 'es' ? 'Error al iniciar sesión' : 'Error signing in'))
    } finally {
      setLoginLoading(false)
    }
  }

  const inputStyle = (err) => ({
    width: '100%',
    padding: '12px 16px',
    border: `1.5px solid ${err ? 'var(--red)' : 'var(--border)'}`,
    borderRadius: 10,
    fontSize: 14,
    background: 'var(--surface)',
    color: 'var(--text)',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  })

  return (
    <div className="slide-in" style={{ maxWidth: 480, margin: '0 auto' }}>
      <StepHeader
        title={lang === 'es' ? 'Tu cuenta' : 'Your account'}
        subtitle={lang === 'es' ? 'Crea una cuenta o inicia sesión para continuar.' : 'Create an account or sign in to continue.'}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--surface-2)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
        {[
          { id: 'register', label: lang === 'es' ? 'Crear cuenta' : 'Create account' },
          { id: 'login',    label: lang === 'es' ? 'Ya tengo cuenta' : 'Sign in' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: 9,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: tab === t.id ? 'var(--surface)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-2)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Register form ── */}
      {tab === 'register' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Nombres + Apellidos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                {lang === 'es' ? 'Nombres' : 'First name'} *
              </label>
              <input
                type="text"
                value={reg.firstName}
                onChange={e => setReg(p => ({ ...p, firstName: e.target.value }))}
                placeholder={lang === 'es' ? 'Juan' : 'John'}
                style={inputStyle(regErrors.firstName)}
              />
              <FieldError msg={regErrors.firstName} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                {lang === 'es' ? 'Apellidos' : 'Last name'} *
              </label>
              <input
                type="text"
                value={reg.lastName}
                onChange={e => setReg(p => ({ ...p, lastName: e.target.value }))}
                placeholder={lang === 'es' ? 'Pérez García' : 'Smith'}
                style={inputStyle(regErrors.lastName)}
              />
              <FieldError msg={regErrors.lastName} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Correo electrónico' : 'Email address'} *
            </label>
            <input
              type="email"
              value={reg.email}
              onChange={e => setReg(p => ({ ...p, email: e.target.value }))}
              placeholder="hola@minegocio.com"
              style={inputStyle(regErrors.email)}
            />
            <FieldError msg={regErrors.email} />
          </div>

          {/* Phone with dial code */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Teléfono' : 'Phone'} *
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <DialCodeSelect
                value={reg.dialCode}
                onChange={code => setReg(p => ({ ...p, dialCode: code }))}
              />
              <div style={{ flex: 1 }}>
                <input
                  type="tel"
                  value={reg.phone}
                  onChange={e => setReg(p => ({ ...p, phone: e.target.value }))}
                  placeholder="999 999 999"
                  style={inputStyle(regErrors.phone)}
                />
              </div>
            </div>
            <FieldError msg={regErrors.phone} />
          </div>

          {/* Empresa (required) */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Empresa' : 'Company'} *
            </label>
            <input
              type="text"
              value={reg.company}
              onChange={e => setReg(p => ({ ...p, company: e.target.value }))}
              placeholder={lang === 'es' ? 'Mi Empresa SAC' : 'My Company Inc'}
              style={inputStyle(regErrors.company)}
            />
            <FieldError msg={regErrors.company} />
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Contraseña' : 'Password'} *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showRegPw ? 'text' : 'password'}
                value={reg.password}
                onChange={e => setReg(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                style={{ ...inputStyle(regErrors.password), paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowRegPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
              >
                {showRegPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={reg.password} />
            <FieldError msg={regErrors.password} />
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Confirmar contraseña' : 'Confirm password'} *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showRegPw ? 'text' : 'password'}
                value={reg.confirmPassword}
                onChange={e => setReg(p => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                style={inputStyle(regErrors.confirmPassword)}
              />
            </div>
            <FieldError msg={regErrors.confirmPassword} />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={e => setTermsChecked(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--orange)', flexShrink: 0 }}
            />
            {lang === 'es'
              ? 'Acepto los términos y condiciones de servicio de Nithrox'
              : 'I accept Nithrox\'s terms and conditions of service'}
          </label>
          <FieldError msg={regErrors.terms} />

          {regServerError && (
            <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', borderRadius: 10, fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
              {regServerError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => router.push('/checkout/plan')}
              style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
            >
              ← {lang === 'es' ? 'Atrás' : 'Back'}
            </button>
            <button
              type="submit"
              disabled={regLoading}
              style={{
                padding: '14px 28px', background: 'var(--orange)', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: regLoading ? 'not-allowed' : 'pointer', opacity: regLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {regLoading && <span className="spinner" />}
              {regLoading
                ? (lang === 'es' ? 'Creando cuenta...' : 'Creating account...')
                : (lang === 'es' ? 'Crear cuenta →' : 'Create account →')}
            </button>
          </div>
        </form>
      )}

      {/* ── Login form ── */}
      {tab === 'login' && (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Correo electrónico' : 'Email address'}
            </label>
            <input
              type="email"
              value={login.email}
              onChange={e => setLogin(p => ({ ...p, email: e.target.value }))}
              placeholder="hola@minegocio.com"
              style={inputStyle(loginErrors.email)}
            />
            <FieldError msg={loginErrors.email} />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Contraseña' : 'Password'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showLoginPw ? 'text' : 'password'}
                value={login.password}
                onChange={e => setLogin(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                style={{ ...inputStyle(loginErrors.password), paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowLoginPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}
              >
                {showLoginPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError msg={loginErrors.password} />
          </div>

          {loginServerError && (
            <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.08)', borderRadius: 10, fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>
              {loginServerError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button
              type="button"
              onClick={() => router.push('/checkout/plan')}
              style={{ padding: '14px 20px', background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text-2)' }}
            >
              ← {lang === 'es' ? 'Atrás' : 'Back'}
            </button>
            <button
              type="submit"
              disabled={loginLoading}
              style={{
                padding: '14px 28px', background: 'var(--orange)', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: loginLoading ? 'not-allowed' : 'pointer', opacity: loginLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {loginLoading && <span className="spinner" />}
              {loginLoading
                ? (lang === 'es' ? 'Ingresando...' : 'Signing in...')
                : (lang === 'es' ? 'Iniciar sesión →' : 'Sign in →')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
