import React, { useState } from 'react'
import { EVENT_META } from '../lib/constants'
import { calcScore, getHeatLevel } from '../lib/mapUtils'
import { useComments } from '../hooks/useComments'

// ── Skeleton de loading ────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 14, radius = 6, style = {} }) {
  return (
    <div style={{
      width, height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, #1a1a26 25%, #22223a 50%, #1a1a26 75%)',
      backgroundSize: '400px 100%',
      animation: 'shimmer 1.4s ease infinite',
      ...style,
    }} />
  )
}

function CommentSkeleton() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #1a1a26' }}>
      <Skeleton width={30} height={30} radius={50} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="40%" height={12} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="70%" height={12} />
      </div>
    </div>
  )
}

export default function DetailPanel({ location, events, user, onClose }) {
  const open = !!location
  const { comments, loading: commentsLoading, addComment } = useComments(location?.id)
  const [commentText, setCommentText] = useState('')
  const [tab, setTab] = useState('info') // 'info' | 'comments'
  const [submitting, setSubmitting] = useState(false)

  if (!location) return null

  const score     = calcScore(location.id, events)
  const heat      = getHeatLevel(score)
  const heatColor = { hot: '#ff2d55', mid: '#ffcc00', low: '#6666aa' }[heat]
  const locEvts   = events
    .filter(e => e.locationId === location.id && Date.now() - e.ts < 3_600_000)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 8)

  const typeCounts = {}
  locEvts.forEach(e => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1 })

  const handleComment = async (e) => {
    e?.preventDefault?.()
    const text = commentText.trim()
    if (!text || submitting) return
    setSubmitting(true)
    try {
      await addComment(text, user.uid, user.name, user.photo)
      setCommentText('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 1999,
        background: 'rgba(0,0,0,.55)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .3s',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 2000, background: '#12121a',
        borderTop: '1px solid #2a2a3d',
        borderRadius: '20px 20px 0 0',
        padding: '0 16px 36px',
        maxHeight: '80vh', overflowY: 'auto',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ width: 40, height: 4, background: '#2a2a3d', borderRadius: 2, margin: '12px auto 16px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{location.name}</h2>
            <span style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              color: heatColor, letterSpacing: '.08em',
            }}>
              {heat === 'hot' ? '🔥 QUENTE' : heat === 'mid' ? '⚡ ATIVO' : '⚫ CALMO'}
            </span>
          </div>
          <div style={{
            background: '#1a1a26', border: '1px solid #2a2a3d',
            borderRadius: 10, padding: '8px 12px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: heatColor }}>
              {score.toFixed(0)}
            </div>
            <div style={{ fontSize: 10, color: '#6666aa', textTransform: 'uppercase' }}>score</div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {Object.entries(typeCounts).map(([type, cnt]) => {
            const meta = EVENT_META[type]; if (!meta) return null
            return (
              <span key={type} style={{
                background: '#1a1a26', border: '1px solid #2a2a3d',
                borderRadius: 20, padding: '4px 10px',
                fontSize: 12, color: '#f0f0ff',
              }}>{meta.emoji} {meta.label} ({cnt})</span>
            )
          })}
          {Object.keys(typeCounts).length === 0 &&
            <span style={{ fontSize: 12, color: '#6666aa' }}>Sem reportes recentes</span>}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {['info', 'comments'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8,
              border: 'none', cursor: 'pointer',
              background: tab === t ? '#ff2d55' : '#1a1a26',
              color: tab === t ? '#fff' : '#6666aa',
              fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12,
              transition: 'all .15s',
            }}>
              {t === 'info'
                ? '📋 Timeline'
                : `💬 Comentários${commentsLoading ? '' : ` (${comments.length})`}`}
            </button>
          ))}
        </div>

        {/* ── TAB: Timeline ─────────────────────────────────────────────────── */}
        {tab === 'info' && (
          <div>
            {locEvts.length === 0
              ? <p style={{ color: '#6666aa', fontSize: 13, padding: '10px 0' }}>
                  Nenhum reporte na última hora.
                </p>
              : locEvts.map(ev => {
                  const meta = EVENT_META[ev.type]; if (!meta) return null
                  const mins = Math.round((Date.now() - ev.ts) / 60_000)
                  return (
                    <div key={ev.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0', borderBottom: '1px solid #1a1a26',
                    }}>
                      <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                      <span style={{ flex: 1, fontSize: 13 }}>{meta.label}</span>
                      <span style={{ fontSize: 11, color: '#6666aa', fontFamily: "'Space Mono',monospace" }}>
                        {mins === 0 ? 'agora' : `${mins}m atrás`}
                      </span>
                    </div>
                  )
                })
            }
          </div>
        )}

        {/* ── TAB: Comentários ──────────────────────────────────────────────── */}
        {tab === 'comments' && (
          <div>
            {/* Input */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <img src={user.photo} alt="" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment(e)}
                placeholder="Comente sobre este local..."
                maxLength={200}
                disabled={submitting}
                style={{
                  flex: 1, background: '#1a1a26', border: '1px solid #2a2a3d',
                  borderRadius: 10, padding: '8px 12px',
                  color: '#f0f0ff', fontFamily: "'Syne',sans-serif", fontSize: 13,
                  outline: 'none', opacity: submitting ? 0.6 : 1,
                  transition: 'opacity .2s',
                }}
              />
              <button
                onClick={handleComment}
                disabled={submitting || !commentText.trim()}
                style={{
                  background: submitting ? '#3a1a22' : '#ff2d55',
                  border: 'none', borderRadius: 10,
                  padding: '8px 14px', color: '#fff', cursor: submitting ? 'default' : 'pointer',
                  fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13,
                  opacity: (!commentText.trim() || submitting) ? 0.5 : 1,
                  transition: 'all .2s',
                }}
              >
                {submitting ? '…' : '↑'}
              </button>
            </div>

            {/* Skeleton enquanto carrega */}
            {commentsLoading && (
              <>
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </>
            )}

            {/* Lista de comentários */}
            {!commentsLoading && comments.length === 0 && (
              <p style={{ color: '#6666aa', fontSize: 13 }}>Seja o primeiro a comentar!</p>
            )}

            {!commentsLoading && comments.map(c => (
              <div key={c.id} style={{
                display: 'flex', gap: 10, padding: '10px 0',
                borderBottom: '1px solid #1a1a26',
              }}>
                <img
                  src={c.userPhoto} alt=""
                  style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }}
                />
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{c.userName}</span>
                    <span style={{ fontSize: 10, color: '#6666aa', fontFamily: "'Space Mono',monospace" }}>
                      {Math.round((Date.now() - c.ts) / 60_000)}m atrás
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#c0c0e0', lineHeight: 1.4 }}>{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
