// pages/TermsOfService.jsx — Termos de Uso do Urbyn
// Rota: /termos

import React from 'react'

const S = {
  page: {
    minHeight: '100dvh',
    background: '#0d0d14',
    color: '#f5f4ff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    padding: '40px 20px 80px',
  },
  inner: { maxWidth: 680, margin: '0 auto' },
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', color: '#6b6990',
    cursor: 'pointer', fontSize: 13, marginBottom: 32, padding: 0,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  dot: {
    width: 10, height: 10, borderRadius: '50%',
    background: 'linear-gradient(135deg, #ff5c35, #a855f7)',
    boxShadow: '0 0 12px rgba(255,92,53,.5)',
  },
  appName: {
    fontSize: 14, fontWeight: 800, letterSpacing: '.12em',
    textTransform: 'uppercase', fontFamily: "'Syne', sans-serif",
  },
  h1: { fontSize: 26, fontWeight: 800, marginBottom: 8, fontFamily: "'Syne', sans-serif" },
  updated: { fontSize: 12, color: '#6b6990', marginBottom: 40 },
  h2: { fontSize: 15, fontWeight: 700, marginTop: 36, marginBottom: 10, color: '#f5f4ff' },
  p: { fontSize: 14, lineHeight: 1.8, color: '#c4c2e8', marginBottom: 12 },
  ul: { paddingLeft: 20, marginBottom: 12 },
  li: { fontSize: 14, lineHeight: 1.8, color: '#c4c2e8', marginBottom: 4 },
  divider: { border: 'none', borderTop: '1px solid #252538', margin: '40px 0' },
  contact: {
    background: '#13131f',
    border: '1px solid #252538',
    borderRadius: 14, padding: '16px 20px', marginTop: 32,
  },
  email: { color: '#ff5c35', textDecoration: 'none', fontWeight: 600 },
}

export default function TermsOfService() {
  return (
    <div style={S.page}>
      <div style={S.inner}>
        <button style={S.back} onClick={() => window.history.back()}>← Voltar</button>

        <div style={S.logo}>
          <div style={S.dot} />
          <span style={S.appName}>Urbyn</span>
        </div>

        <h1 style={S.h1}>Termos de Uso</h1>
        <p style={S.updated}>Última atualização: maio de 2026</p>

        <h2 style={S.h2}>1. Aceitação dos Termos</h2>
        <p style={S.p}>
          Ao acessar ou usar o Urbyn, você concorda com estes Termos de Uso. Se não concordar,
          não utilize o aplicativo.
        </p>

        <h2 style={S.h2}>2. O que é o Urbyn</h2>
        <p style={S.p}>
          O Urbyn é uma plataforma colaborativa de informações em tempo real sobre pontos da cidade:
          bares, trânsito, eventos e hotspots. Os usuários contribuem com reportes e informações
          de forma voluntária.
        </p>

        <h2 style={S.h2}>3. Regras de Uso</h2>
        <p style={S.p}>Ao usar o Urbyn, você se compromete a:</p>
        <ul style={S.ul}>
          <li style={S.li}>Fornecer informações verdadeiras e precisas nos seus reportes.</li>
          <li style={S.li}>Não publicar conteúdo ofensivo, falso ou enganoso.</li>
          <li style={S.li}>Não assediar, ameaçar ou prejudicar outros usuários.</li>
          <li style={S.li}>Não burlar sistemas de moderação ou rate limiting.</li>
          <li style={S.li}>Não usar bots ou automação para criar reportes em massa.</li>
          <li style={S.li}>Respeitar a privacidade e os dados de outros usuários.</li>
        </ul>

        <h2 style={S.h2}>4. Conteúdo do Usuário</h2>
        <p style={S.p}>
          Você é responsável pelo conteúdo que publica. Ao publicar um reporte ou comentário,
          concede ao Urbyn licença não exclusiva para exibir esse conteúdo na plataforma.
          Reservamo-nos o direito de remover qualquer conteúdo que viole estes termos.
        </p>

        <h2 style={S.h2}>5. Moderação e Suspensão</h2>
        <p style={S.p}>
          O Urbyn pode suspender ou encerrar sua conta a qualquer momento, sem aviso prévio,
          em caso de violação destes termos. Você pode reportar abusos diretamente pelo app.
        </p>

        <h2 style={S.h2}>6. Limitação de Responsabilidade</h2>
        <p style={S.p}>
          As informações publicadas são de responsabilidade dos usuários que as criaram. O Urbyn
          não garante precisão, atualidade ou completude das informações. Não nos responsabilizamos
          por decisões tomadas com base em dados do app.
        </p>

        <h2 style={S.h2}>7. Alterações</h2>
        <p style={S.p}>
          Podemos atualizar estes termos periodicamente. O uso contínuo após a publicação de
          novos termos constitui aceitação das alterações.
        </p>

        <hr style={S.divider} />

        <div style={S.contact}>
          <p style={{ ...S.p, marginBottom: 6, color: '#c4c2e8' }}>Dúvidas sobre os Termos de Uso?</p>
          <a href="mailto:contato@urbyn.app" style={S.email}>contato@urbyn.app</a>
        </div>
      </div>
    </div>
  )
}
