import React, { useState } from 'react'

const C = {
  bg:      '#0b1410',
  surface: '#131f18',
  surf2:   '#182419',
  border:  '#243028',
  green:   '#1db954',
  red:     '#ff3b5c',
  text:    '#e8f5e9',
  muted:   '#6a8a72',
  dim:     '#3a5040',
}

function RuLogo() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:900, fontSize:42, color:C.green, letterSpacing:'-.04em', lineHeight:1 }}>Ru</div>
      <div style={{ width:11, height:11, borderRadius:'50%', background:C.green, boxShadow:`0 0 12px ${C.green}`, marginTop:-18 }}/>
    </div>
  )
}

export default function LoginScreen({ onLogin, loginWithEmail, registerWithEmail, resetPassword, authError, setAuthError }) {
  const [tab,      setTab]      = useState('main')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [busy,     setBusy]     = useState(false)
  const [localErr, setLocalErr] = useState(null)
  const [success,  setSuccess]  = useState(null)
  const [showPass, setShowPass] = useState(false)

  const err = localErr || authError
  const clearErr = () => { setLocalErr(null); setAuthError?.(null) }
  const goTab = (t) => { setTab(t); clearErr(); setSuccess(null) }

  const handleGoogle = async () => { clearErr(); setBusy(true); await onLogin(); setBusy(false) }

  const handleEmailLogin = async (e) => {
    e.preventDefault(); clearErr()
    if (!email || !password) { setLocalErr('Preencha e-mail e senha.'); return }
    setBusy(true)
    const res = await loginWithEmail?.(email, password)
    setBusy(false)
    if (!res?.ok) setLocalErr(res?.error)
  }

  const handleRegister = async (e) => {
    e.preventDefault(); clearErr()
    if (!name.trim())        { setLocalErr('Informe seu nome.'); return }
    if (!email)              { setLocalErr('Informe seu e-mail.'); return }
    if (password.length < 6) { setLocalErr('Senha deve ter ao menos 6 caracteres.'); return }
    if (password !== confirm) { setLocalErr('As senhas não coincidem.'); return }
    setBusy(true)
    const res = await registerWithEmail?.(name.trim(), email, password)
    setBusy(false)
    if (res?.ok) setSuccess('Conta criada! Verifique seu e-mail para confirmar.')
    else setLocalErr(res?.error)
  }

  const handleReset = async (e) => {
    e.preventDefault(); clearErr()
    if (!email) { setLocalErr('Informe seu e-mail.'); return }
    setBusy(true)
    const res = await resetPassword?.(email)
    setBusy(false)
    if (res?.ok) setSuccess('Link de recuperação enviado! Verifique seu e-mail.')
    else setLocalErr(res?.error)
  }

  const Input = ({ label, type='text', value, onChange, placeholder, extra }) => (
    <div style={{ width:'100%' }}>
      <label style={{ display:'block', fontSize:11, color:C.muted, marginBottom:5, letterSpacing:'.06em', textTransform:'uppercase' }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <input
          type={type==='password' && showPass ? 'text' : type}
          value={value} onChange={onChange} placeholder={placeholder}
          autoComplete={type==='password' ? 'current-password' : type==='email' ? 'email' : 'name'}
          style={{
            width:'100%', background:C.surf2, border:`1px solid ${C.border}`,
            borderRadius:12, padding:'12px 14px', color:C.text,
            fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, outline:'none',
            boxSizing:'border-box', paddingRight: type==='password' ? 44 : 14,
            transition:'border-color .2s',
          }}
          onFocus={e => e.target.style.borderColor = C.green}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        {type==='password' && (
          <button onClick={() => setShowPass(p => !p)} type="button"
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:16, padding:0 }}>
            {showPass ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {extra}
    </div>
  )

  const Btn = ({ children, onClick, type='button', variant='primary', disabled }) => {
    const styles = {
      primary:   { background:C.green, color:'#0b1410', border:'none' },
      secondary: { background:C.surf2, color:C.text, border:`1px solid ${C.border}` },
      ghost:     { background:'transparent', color:C.muted, border:'none' },
    }
    return (
      <button type={type} onClick={onClick} disabled={disabled || busy}
        style={{
          width:'100%', padding:'13px', borderRadius:12, cursor:'pointer',
          fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14,
          transition:'opacity .15s, transform .1s', opacity:(disabled||busy)?.5:1,
          ...styles[variant],
        }}
        onMouseEnter={e => e.currentTarget.style.opacity='.85'}
        onMouseLeave={e => e.currentTarget.style.opacity='1'}
      >{busy && variant==='primary' ? '...' : children}</button>
    )
  }

  const Card = ({ children }) => (
    <div style={{
      width:'100%', maxWidth:360,
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:20, padding:'28px 24px',
      display:'flex', flexDirection:'column', gap:16,
    }}>{children}</div>
  )

  const ErrBox = ({ msg }) => msg ? (
    <div style={{ background:'rgba(255,59,92,.08)', border:'1px solid rgba(255,59,92,.3)',
      borderRadius:10, padding:'10px 14px', fontSize:12, color:C.red, lineHeight:1.6 }}>{msg}</div>
  ) : null

  const SuccessBox = ({ msg }) => msg ? (
    <div style={{ background:'rgba(29,185,84,.08)', border:'1px solid rgba(29,185,84,.3)',
      borderRadius:10, padding:'10px 14px', fontSize:12, color:C.green, lineHeight:1.6 }}>{msg}</div>
  ) : null

  const Divider = () => (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <div style={{ flex:1, height:1, background:C.border }}/>
      <span style={{ fontSize:11, color:C.muted }}>ou</span>
      <div style={{ flex:1, height:1, background:C.border }}/>
    </div>
  )

  const BackBtn = ({ to }) => (
    <button onClick={() => goTab(to)} type="button"
      style={{ background:'none', border:'none', color:C.muted, cursor:'pointer',
        fontSize:12, padding:'4px 0', textAlign:'left', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      ← Voltar
    </button>
  )

  if (tab === 'main') return (
    <Wrap>
      {/* Decorative glow */}
      <div style={{
        position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)',
        width:300, height:300, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(29,185,84,.12) 0%, transparent 70%)',
        pointerEvents:'none',
      }}/>

      <RuLogo />
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:26, fontWeight:900, color:C.text, lineHeight:1.2, marginBottom:8 }}>
          Sua cidade.<br/><span style={{ color:C.green }}>Do seu jeito.</span>
        </div>
        <p style={{ color:C.muted, fontSize:13, lineHeight:1.8 }}>
          Descubra, avalie e compartilhe os<br/>melhores lugares da sua cidade.
        </p>
      </div>

      {/* Feature pills */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center', maxWidth:320 }}>
        {['🔍 Descubra lugares', '👥 Conecte-se', '⭐ Avalie e compartilhe'].map(f => (
          <div key={f} style={{
            background:'rgba(29,185,84,.08)', border:'1px solid rgba(29,185,84,.2)',
            borderRadius:100, padding:'6px 14px', fontSize:12, color:C.green, fontWeight:600,
          }}>{f}</div>
        ))}
      </div>

      {authError === 'unauthorized-domain' && (
        <div style={{ width:'100%', maxWidth:360, background:'rgba(255,59,92,.08)',
          border:'1px solid rgba(255,59,92,.35)', borderRadius:14, padding:16 }}>
          <div style={{ fontSize:13, fontWeight:800, color:C.red, marginBottom:8 }}>⚠️ Domínio não autorizado</div>
          <div style={{ fontSize:11, color:'#aaaacc', lineHeight:1.7 }}>
            Firebase Console → Authentication → Authorized domains → Add:
          </div>
          <div style={{ background:C.bg, borderRadius:8, padding:'8px 12px',
            fontFamily:"'Space Mono',monospace", fontSize:11, color:C.green, margin:'8px 0' }}>
            {window.location.hostname}
          </div>
        </div>
      )}

      <Card>
        <Btn onClick={handleGoogle} variant="primary">
          <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <GoogleIcon /> Continuar com Google
          </span>
        </Btn>
        <Divider />
        <Btn onClick={() => goTab('email-login')} variant="secondary">✉️ &nbsp;Entrar com E-mail</Btn>
        <button onClick={() => goTab('email-register')} type="button"
          style={{ background:'none', border:'none', color:C.muted, cursor:'pointer',
            fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif", textDecoration:'underline', padding:'2px 0' }}>
          Não tem conta? Criar conta
        </button>
      </Card>

      <div style={{ fontSize:11, color:C.dim, textAlign:'center', lineHeight:1.6 }}>
        <a href="/privacy" style={{ color:C.muted }}>Política de Privacidade</a>
      </div>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`}</style>
    </Wrap>
  )

  if (tab === 'email-login') return (
    <Wrap>
      <RuLogo />
      <Card>
        <BackBtn to="main" />
        <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Bem-vindo de volta! 👋</div>
        <ErrBox msg={err} /><SuccessBox msg={success} />
        <form onSubmit={handleEmailLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Input label="E-mail" type="email" value={email} onChange={e => { setEmail(e.target.value); clearErr() }} placeholder="seu@email.com" />
          <Input label="Senha" type="password" value={password} onChange={e => { setPassword(e.target.value); clearErr() }} placeholder="••••••••"
            extra={<button onClick={() => goTab('reset')} type="button"
              style={{ background:'none', border:'none', color:C.muted, cursor:'pointer',
                fontSize:11, padding:'4px 0', textAlign:'right', width:'100%',
                fontFamily:"'Plus Jakarta Sans',sans-serif", textDecoration:'underline', marginTop:4 }}>
              Esqueci minha senha</button>}
          />
          <Btn type="submit" variant="primary">Entrar</Btn>
        </form>
        <Divider />
        <Btn onClick={handleGoogle} variant="secondary">
          <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <GoogleIcon /> Continuar com Google
          </span>
        </Btn>
        <button onClick={() => goTab('email-register')} type="button"
          style={{ background:'none', border:'none', color:C.muted, cursor:'pointer',
            fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif", textDecoration:'underline', padding:'2px 0' }}>
          Não tem conta? Criar conta
        </button>
      </Card>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`}</style>
    </Wrap>
  )

  if (tab === 'email-register') return (
    <Wrap>
      <RuLogo />
      <Card>
        <BackBtn to="main" />
        <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Criar conta</div>
        <ErrBox msg={err} /><SuccessBox msg={success} />
        {!success && (
          <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="Seu nome" type="text" value={name} onChange={e => { setName(e.target.value); clearErr() }} placeholder="Como quer ser chamado?" />
            <Input label="E-mail" type="email" value={email} onChange={e => { setEmail(e.target.value); clearErr() }} placeholder="seu@email.com" />
            <Input label="Senha" type="password" value={password} onChange={e => { setPassword(e.target.value); clearErr() }} placeholder="Mínimo 6 caracteres" />
            <Input label="Confirmar senha" type="password" value={confirm} onChange={e => { setConfirm(e.target.value); clearErr() }} placeholder="Repita a senha" />
            <Btn type="submit" variant="primary">Criar conta</Btn>
          </form>
        )}
        {success && <Btn onClick={() => goTab('email-login')} variant="secondary">Ir para o login</Btn>}
        <button onClick={() => goTab('email-login')} type="button"
          style={{ background:'none', border:'none', color:C.muted, cursor:'pointer',
            fontSize:12, fontFamily:"'Plus Jakarta Sans',sans-serif", textDecoration:'underline', padding:'2px 0' }}>
          Já tem conta? Entrar
        </button>
      </Card>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`}</style>
    </Wrap>
  )

  if (tab === 'reset') return (
    <Wrap>
      <RuLogo />
      <Card>
        <BackBtn to="email-login" />
        <div style={{ fontSize:16, fontWeight:700, color:C.text }}>Recuperar senha</div>
        <div style={{ fontSize:13, color:C.muted, lineHeight:1.7 }}>
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </div>
        <ErrBox msg={err} /><SuccessBox msg={success} />
        {!success && (
          <form onSubmit={handleReset} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Input label="E-mail" type="email" value={email} onChange={e => { setEmail(e.target.value); clearErr() }} placeholder="seu@email.com" />
            <Btn type="submit" variant="primary">Enviar link</Btn>
          </form>
        )}
        {success && <Btn onClick={() => goTab('email-login')} variant="secondary">Voltar para o login</Btn>}
      </Card>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}`}</style>
    </Wrap>
  )

  return null
}

function Wrap({ children }) {
  return (
    <div style={{
      position:'fixed', inset:0, background:'#0b1410',
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', fontFamily:"'Plus Jakarta Sans',sans-serif",
      gap:22, padding:'24px 16px', overflowY:'auto', position:'relative',
    }}>{children}</div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 32.8 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.8 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.5-3.1-11.3-7.6l-6.6 5.1C9.6 39.4 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.5-2.5 4.6-4.7 6l6.2 5.2C40.6 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
    </svg>
  )
}
