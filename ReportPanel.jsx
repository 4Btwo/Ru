import React, { useState } from 'react'

const EVENTS_NIGHT = [
  { type: 'cheio',  emoji: '🔥', label: 'Cheio'    },
  { type: 'evento', emoji: '🎉', label: 'Evento'   },
  { type: 'morto',  emoji: '💀', label: 'Vazio'    },
  { type: 'show',   emoji: '🎸', label: 'Show'     },
  { type: 'briga',  emoji: '⚠️', label: 'Confusão' },
]
const EVENTS_TRANSIT = [
  { type: 'pesado',   emoji: '🚗', label: 'Trânsito' },
  { type: 'bloqueio', emoji: '🚧', label: 'Bloqueio'  },
  { type: 'acidente', emoji: '🚨', label: 'Acidente'  },
]

export default function ReportPanel({ open, onClose, onConfirm }) {
  const [selected, setSelected] = useState(null)

  const handle = (type) => setSelected(type === selected ? null : type)

  const confirm = () => {
    if (!selected) return
    onConfirm(selected)
    setSelected(null)
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1999,
          background: 'rgba(0,0,0,.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity .3s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 2000,
        background: '#12121a',
        borderTop: '1px solid #2a2a3d',
        borderRadius: '20px 20px 0 0',
        padding: '0 16px 36px',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width: 40, height: 4, background: '#2a2a3d', borderRadius: 2, margin: '12px auto 18px' }} />
        <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Reportar Ocorrência</p>
        <p style={{ color: '#6666aa', fontSize: 12, marginBottom: 18 }}>No local mais próximo a você</p>

        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6666aa', marginBottom: 10 }}>🌙 Vida Noturna</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
          {EVENTS_NIGHT.map(e => (
            <EventBtn key={e.type} {...e} active={selected === e.type} onClick={() => handle(e.type)} color="#ff2d55" />
          ))}
        </div>

        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', color: '#6666aa', marginBottom: 10 }}>🚦 Trânsito</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {EVENTS_TRANSIT.map(e => (
            <EventBtn key={e.type} {...e} active={selected === e.type} onClick={() => handle(e.type)} color="#ff6b35" />
          ))}
        </div>

        <button
          onClick={confirm}
          disabled={!selected}
          style={{
            width: '100%', padding: 15, borderRadius: 12,
            border: 'none', cursor: selected ? 'pointer' : 'not-allowed',
            background: selected ? '#ff2d55' : '#2a2a3d',
            color: '#fff', fontFamily: "'Syne',sans-serif",
            fontWeight: 700, fontSize: 15,
            transition: 'background .2s',
          }}
        >
          {selected ? '📡 Confirmar Reporte' : 'Selecione uma ocorrência'}
        </button>
      </div>
    </>
  )
}

function EventBtn({ type, emoji, label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: active ? `${color}1e` : '#1a1a26',
      border: `1px solid ${active ? color : '#2a2a3d'}`,
      borderRadius: 12, padding: '12px 6px',
      cursor: 'pointer', textAlign: 'center',
      color: active ? color : '#f0f0ff',
      fontFamily: "'Syne',sans-serif", fontSize: 11, fontWeight: 600,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      transition: 'all .15s',
    }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      {label}
    </button>
  )
}
