// pages/PrivacyPolicy.jsx
// Política de privacidade — obrigatória para Google OAuth
// Rota sugerida: /privacidade
// Adicione no seu roteador ou abra em janela separada.

import React from 'react'

const S = {
  page: {
    minHeight: '100dvh',
    background: '#0a0a0f',
    color: '#f0f0ff',
    fontFamily: "'Syne', sans-serif",
    padding: '40px 20px 80px',
  },
  inner: { maxWidth: 680, margin: '0 auto' },
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', color: '#6666aa',
    cursor: 'pointer', fontFamily: "'Inter',sans-serif",
    fontSize: 13, marginBottom: 32, padding: 0,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32,
  },
  dot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#ff2d55', boxShadow: '0 0 10px #ff2d55',
  },
  appName: { fontSize: 14, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' },
  h1: { fontSize: 26, fontWeight: 800, marginBottom: 8 },
  updated: { fontSize: 12, color: '#6666aa', marginBottom: 40 },
  h2: { fontSize: 16, fontWeight: 700, marginTop: 36, marginBottom: 12, color: '#f0f0ff' },
  p: { fontSize: 14, lineHeight: 1.8, color: '#c0c0e0', marginBottom: 12 },
  ul: { paddingLeft: 20, marginBottom: 12 },
  li: { fontSize: 14, lineHeight: 1.8, color: '#c0c0e0', marginBottom: 4 },
  divider: { border: 'none', borderTop: '1px solid #2a2a3d', margin: '40px 0' },
  contact: {
    background: '#12121a', border: '1px solid #2a2a3d',
    borderRadius: 12, padding: '16px 20px', marginTop: 32,
  },
  email: { color: '#ff2d55', textDecoration: 'none' },
}

export default function PrivacyPolicy() {
  return (
    <div style={S.page}>
      <div style={S.inner}>
        <button style={S.back} onClick={() => window.history.back()}>
          ← Voltar
        </button>

        <div style={S.logo}>
          <div style={S.dot} />
          <span style={S.appName}>Urbyn</span>
        </div>

        <h1 style={S.h1}>Política de Privacidade</h1>
        <p style={S.updated}>Última atualização: março de 2026</p>

        <p style={S.p}>
          Esta política descreve como o <strong>Urbyn</strong> coleta, usa e protege
          as informações dos usuários. Ao usar o aplicativo, você concorda com os termos aqui descritos.
        </p>

        <h2 style={S.h2}>1. Informações que coletamos</h2>
        <p style={S.p}>Ao fazer login com Google, coletamos:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Nome e foto de perfil</strong> — exibidos no app e nos comentários</li>
          <li style={S.li}><strong>E-mail</strong> — usado apenas para autenticação, não compartilhado</li>
          <li style={S.li}><strong>ID único do Google</strong> — identifica sua conta no banco de dados</li>
        </ul>
        <p style={S.p}>Durante o uso do app, também coletamos:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Localização geográfica</strong> — apenas com sua permissão explícita, para identificar o local mais próximo ao seu reporte. Não armazenamos histórico de localização.</li>
          <li style={S.li}><strong>Reportes e comentários</strong> — conteúdo que você cria voluntariamente</li>
          <li style={S.li}><strong>Token FCM</strong> — identificador de dispositivo para envio de notificações push, caso você autorize</li>
          <li style={S.li}><strong>Pontuação e estatísticas</strong> — número de reportes e pontos acumulados</li>
        </ul>

        <h2 style={S.h2}>2. Como usamos suas informações</h2>
        <ul style={S.ul}>
          <li style={S.li}>Autenticar seu acesso ao aplicativo</li>
          <li style={S.li}>Exibir seu nome e foto nos reportes e comentários públicos</li>
          <li style={S.li}>Calcular e exibir sua pontuação no ranking</li>
          <li style={S.li}>Enviar notificações sobre atividades próximas (somente se autorizado)</li>
          <li style={S.li}>Melhorar a qualidade e relevância dos dados do app</li>
        </ul>
        <p style={S.p}>
          <strong>Não vendemos, alugamos ou compartilhamos seus dados com terceiros</strong> para fins publicitários ou comerciais.
        </p>

        <h2 style={S.h2}>3. Dados públicos</h2>
        <p style={S.p}>
          Reportes, comentários e seu nome de usuário são visíveis para todos os usuários autenticados do app.
          Seu endereço de e-mail nunca é exibido publicamente.
        </p>

        <h2 style={S.h2}>4. Armazenamento e segurança</h2>
        <p style={S.p}>
          Seus dados são armazenados no <strong>Firebase (Google Cloud)</strong>, protegidos por
          regras de acesso que garantem que cada usuário só pode modificar seus próprios dados.
          A comunicação entre o app e os servidores é sempre feita via HTTPS.
        </p>

        <h2 style={S.h2}>5. Retenção de dados</h2>
        <ul style={S.ul}>
          <li style={S.li}><strong>Eventos/reportes:</strong> removidos automaticamente após 24 horas</li>
          <li style={S.li}><strong>Comentários:</strong> armazenados enquanto sua conta existir</li>
          <li style={S.li}><strong>Perfil e pontuação:</strong> mantidos enquanto você usar o app</li>
        </ul>

        <h2 style={S.h2}>6. Seus direitos</h2>
        <p style={S.p}>Você pode, a qualquer momento:</p>
        <ul style={S.ul}>
          <li style={S.li}><strong>Revogar o acesso</strong> ao app pela sua conta Google em <a href="https://myaccount.google.com/permissions" style={S.email} target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a></li>
          <li style={S.li}><strong>Desativar notificações</strong> nas configurações do seu navegador ou dispositivo</li>
          <li style={S.li}><strong>Solicitar exclusão</strong> dos seus dados enviando e-mail para o contato abaixo</li>
        </ul>

        <h2 style={S.h2}>7. Cookies e rastreamento</h2>
        <p style={S.p}>
          O Urbyn não utiliza cookies de rastreamento nem ferramentas de analytics de terceiros.
          O Firebase utiliza cookies técnicos essenciais para autenticação — estes não podem ser desativados
          sem comprometer o funcionamento do login.
        </p>

        <h2 style={S.h2}>8. Menores de idade</h2>
        <p style={S.p}>
          O Urbyn não é direcionado a menores de 13 anos. Se você acredita que uma criança
          forneceu informações pessoais ao app, entre em contato para que possamos removê-las.
        </p>

        <h2 style={S.h2}>9. Alterações nesta política</h2>
        <p style={S.p}>
          Podemos atualizar esta política ocasionalmente. Notificaremos usuários sobre mudanças
          significativas por meio do próprio aplicativo. O uso continuado após as mudanças
          implica aceitação da política atualizada.
        </p>

        <hr style={S.divider} />

        <div style={S.contact}>
          <p style={{ ...S.p, marginBottom: 4, fontWeight: 700, color: '#f0f0ff' }}>Contato</p>
          <p style={{ ...S.p, marginBottom: 0 }}>
            Para dúvidas, solicitações de exclusão de dados ou qualquer questão relacionada
            à privacidade, entre em contato pelo e-mail:{' '}
            <a href="mailto:privacidade@urbyn.app" style={S.email}>
              privacidade@urbyn.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
