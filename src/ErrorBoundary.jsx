import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: '#0d0d14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: '#f5f4ff',
          textAlign: 'center',
          gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,92,53,.12)',
            border: '1.5px solid rgba(255,92,53,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Algo deu errado</h2>
          <p style={{ fontSize: 14, color: '#6b6990', margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 8,
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #ff5c35, #d946a8)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '-.01em',
            }}
          >
            Recarregar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
