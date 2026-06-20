'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout'
import { createClient } from '@/lib/supabase'
import { useTranslation } from '@/lib/i18n'
import StepHeader from '@/components/checkout/StepHeader'
import { Eye, EyeOff } from 'lucide-react'

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
            height: 4,
            flex: 1,
            borderRadius: 2,
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

export default function AccountPage() {
  const router = useRouter()
  const { lang, setUser } = useCheckoutStore()
  const tr = useTranslation(lang)
  const [tab, setTab] = useState('register')

  // Register form
  const [reg, setReg] = useState({ name: '', email: '', phone: '', company: '', password: '', confirmPassword: '' })
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
    if (!reg.name.trim()) errs.name = lang === 'es' ? 'Nombre requerido' : 'Name required'
    if (!reg.email.includes('@')) errs.email = lang === 'es' ? 'Email inválido' : 'Invalid email'
    if (!reg.phone.trim()) errs.phone = lang === 'es' ? 'Teléfono requerido' : 'Phone required'
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
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: reg.email,
        password: reg.password,
        options: { data: { full_name: reg.name, phone: reg.phone, company: reg.company } },
      })
      if (error) { setRegServerError(error.message); return }
      // upsert profile
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: reg.name,
          email: reg.email,
          phone: reg.phone,
          company: reg.company,
        })
        setUser({ id: data.user.id, email: reg.email, name: reg.name })
      }
      router.push('/checkout/hosting')
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
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUser({ id: user.id, email: user.email, name: profile?.full_name || user.email })
      router.push('/checkout/hosting')
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
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
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

      {/* Register form */}
      {tab === 'register' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              {lang === 'es' ? 'Nombre completo' : 'Full name'} *
            </label>
            <input
              type="text"
              value={reg.name}
              onChange={e => setReg(p => ({ ...p, name: e.target.value }))}
              placeholder={lang === 'es' ? 'Juan Pérez' : 'John Smith'}
              style={inputStyle(regErrors.name)}
            />
            <FieldError msg={regErrors.name} />
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                {lang === 'es' ? 'Teléfono' : 'Phone'} *
              </label>
              <input
                type="tel"
                value={reg.phone}
                onChange={e => setReg(p => ({ ...p, phone: e.target.value }))}
                placeholder="+51 999 999 999"
                style={inputStyle(regErrors.phone)}
              />
              <FieldError msg={regErrors.phone} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
                {lang === 'es' ? 'Empresa' : 'Company'} ({lang === 'es' ? 'opcional' : 'optional'})
              </label>
              <input
                type="text"
                value={reg.company}
                onChange={e => setReg(p => ({ ...p, company: e.target.value }))}
                placeholder={lang === 'es' ? 'Mi Empresa SAC' : 'My Company Inc'}
                style={inputStyle(false)}
              />
            </div>
          </div>

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
                padding: '14px 28px',
                background: 'var(--orange)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: regLoading ? 'not-allowed' : 'pointer',
                opacity: regLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
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

      {/* Login form */}
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
                padding: '14px 28px',
                background: 'var(--orange)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                opacity: loginLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
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
