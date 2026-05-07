// ── PAINEL DE NOTIFICAÇÕES ─────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import { ref, onValue, update, remove, set, get, increment } from 'firebase/database'
import { db } from '../lib/firebase'

const timeAgo = ts => {
  const d = Math.floor((Date.now() - ts) / 1000)
  if (d < 60)    return `${d}s atrás`
  if (d < 3600)  return `${Math.floor(d/60)} min`
  if (d < 86400) return `${Math.floor(d/3600)}h`
  return `${Math.floor(d/86400)}d`
}

/* ── Hook para usar em qualquer lugar ────────────────────────────────────────── */
export function useUserNotifications(uid) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)

  useEffect(() => {
    if (!uid) return
    const nRef = ref(db, `notifications/${uid}`)
    return onValue(nRef, snap => {
      if (!snap.exists()) { setNotifications([]); setUnreadCount(0); return }
      const list = Object.entries(snap.val())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.ts - a.ts)
      setNotifications(list)
      setUnreadCount(list.filter(n => !n.read).length)
    })
  }, [uid])

  const markAllRead = useCallback(async () => {
    if (!uid) return
    const snap = await get(ref(db, `notifications/${uid}`))
    if (!snap.exists()) return
    const updates = {}
    snap.forEach(child => { updates[`notifications/${uid}/${child.key}/read`] = true })
    await update(ref(db), updates)
  }, [uid])

  const markRead = useCallback(async (notifId) => {
    if (!uid) return
    await update(ref(db, `notifications/${uid}/${notifId}`), { read: true })
  }, [uid])

  const deleteNotif = useCallback(async (notifId) => {
    if (!uid) return
    await remove(ref(db, `notifications/${uid}/${notifId}`))
  }, [uid])

  return { notifications, unreadCount, markAllRead, markRead, deleteNotif }
}

/* ── Enviar notificação (utilitário global) ───────────────────────────────────── */
export async function sendNotification(toUid, notification) {
  // notification: { type, title, body, fromUid, fromName, fromPhoto, data }
  const nRef = ref(db, `notifications/${toUid}/${Date.now()}_${Math.random().toString(36).slice(2,7)}`)
  await set(nRef, {
    ...notification,
    ts: Date.now(),
    read: false,
  })
}

/* ── Componente principal ────────────────────────────────────────────────────── */
export default function NotificationsPanel({ open, onClose, currentUser, onOpenChat, onViewUser }) {
  const { notifications, unreadCount, markAllRead, markRead, deleteNotif } =
    useUserNotifications(currentUser?.uid)

  const [tab, setTab] = useState('todas')

  // Ao abrir, marca tudo como lido após 2s
  useEffect(() => {
    if (open && unreadCount > 0) {
      const t = setTimeout(() => markAllRead(), 2000)
      return () => clearTimeout(t)
    }
  }, [open, unreadCount])

  /* ── Aceitar solicitação de seguir ── */
  const handleAcceptFollow = useCallback(async (notif) => {
    if (!currentUser?.uid || !notif.fromUid) return
    // Adiciona o seguidor
    await set(ref(db, `followers/${currentUser.uid}/${notif.fromUid}`), {
      name: notif.fromName, photo: notif.fromPhoto || null, since: Date.now()
    })
    await set(ref(db, `users/${notif.fromUid}/following/${currentUser.uid}`), {
      name: currentUser.name, photo: currentUser.photo || null, since: Date.now()
    })
    await update(ref(db, `users/${currentUser.uid}`), { followers: increment(1) })

    // Notifica quem fez a solicitação que foi aceita
    await sendNotification(notif.fromUid, {
      type: 'follow_accepted',
      title: '✅ Solicitação aceita',
      body: `${currentUser.name} aceitou seu pedido de seguir`,
      fromUid: currentUser.uid,
      fromName: currentUser.name,
      fromPhoto: currentUser.photo || null,
    })

    // Remove a notificação de solicitação
    await deleteNotif(notif.id)

    // Remove da fila de pendentes
    await remove(ref(db, `followRequests/${currentUser.uid}/${notif.fromUid}`))
  }, [currentUser, deleteNotif])

  /* ── Recusar solicitação ── */
  const handleRejectFollow = useCallback(async (notif) => {
    await deleteNotif(notif.id)
    await remove(ref(db, `followRequests/${currentUser.uid}/${notif.fromUid}`))
  }, [currentUser, deleteNotif])

  const filtered = notifications.filter(n => {
    if (tab === 'todas')    return true
    if (tab === 'pessoas')  return ['follow_request','follow_accepted','new_follower'].includes(n.type)
    if (tab === 'promos')   return n.type === 'promo'
    return true
  })

  const NOTIF_ICON = {
    follow_request:  '👤',
    follow_accepted: '✅',
    new_follower:    '🫂',
    promo:           '🎁',
    mention:         '💬',
    alert:           '🔔',
  }

  const NOTIF_COLOR = {
    follow_request:  'var(--blue)',
    follow_accepted: 'var(--green)',
    new_follower:    'var(--green)',
    promo:           '#f59e0b',
    mention:         'var(--purple)',
    alert:           'var(--red)',
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 2900,
        background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition: 'opacity .25s',
      }}/>

      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 3000,
        background: 'var(--bg)', borderRadius: '24px 24px 0 0',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .35s cubic-bezier(.4,0,.2,1)',
        borderTop: '1px solid var(--border)',
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px auto 0', flexShrink: 0 }}/>

        {/* Header */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Notificações</div>
              {unreadCount > 0 && (
                <div style={{
                  background: 'var(--green)', color: '#052e16',
                  borderRadius: 100, padding: '2px 8px',
                  fontSize: 11, fontWeight: 800,
                }}>{unreadCount} nova{unreadCount !== 1 ? 's' : ''}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {notifications.some(n => !n.read) && (
                <button onClick={markAllRead} style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                  color: 'var(--muted)', fontFamily: "'Inter',sans-serif",
                  fontSize: 11, fontWeight: 600,
                }}>Marcar lidas</button>
              )}
              <button onClick={onClose} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--muted)', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[
              { id: 'todas',   label: 'Todas' },
              { id: 'pessoas', label: '👥 Pessoas' },
              { id: 'promos',  label: '🎁 Promos' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '7px 14px', borderRadius: 100,
                background: tab === t.id ? 'rgba(34,197,94,.13)' : 'var(--surface2)',
                border: `1px solid ${tab === t.id ? 'var(--green)' : 'var(--border)'}`,
                color: tab === t.id ? 'var(--green)' : 'var(--muted)',
                fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 11,
                cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', paddingBottom: 'calc(20px + env(safe-area-inset-bottom,0px))' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nada por aqui</div>
              <div style={{ fontSize: 12 }}>Suas notificações aparecerão aqui</div>
            </div>
          ) : filtered.map(notif => (
            <div key={notif.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
              background: notif.read ? 'transparent' : 'rgba(34,197,94,.03)',
              position: 'relative',
            }}>
              {/* Dot unread */}
              {!notif.read && (
                <div style={{
                  position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
                }}/>
              )}

              {/* Avatar ou ícone */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  background: `${NOTIF_COLOR[notif.type] || 'var(--green)'}18`,
                  border: `1px solid ${NOTIF_COLOR[notif.type] || 'var(--green)'}33`,
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {notif.fromPhoto
                    ? <img src={notif.fromPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <span style={{ fontSize: 22 }}>{NOTIF_ICON[notif.type] || '🔔'}</span>
                  }
                </div>
                {notif.fromPhoto && (
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--bg)', border: '1.5px solid var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11,
                  }}>{NOTIF_ICON[notif.type] || '🔔'}</div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: notif.read ? 500 : 700, lineHeight: 1.5, marginBottom: 3 }}>
                  {notif.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {notif.body}
                </div>

                {/* Botões de ação para solicitação de seguir */}
                {notif.type === 'follow_request' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button onClick={() => handleAcceptFollow(notif)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                      background: 'var(--green)', color: '#052e16',
                      fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12,
                      cursor: 'pointer',
                    }}>Aceitar</button>
                    <button onClick={() => handleRejectFollow(notif)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 10,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                      color: 'var(--muted)',
                      fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 12,
                      cursor: 'pointer',
                    }}>Recusar</button>
                  </div>
                )}

                {/* Botão Ver perfil para new_follower / follow_accepted */}
                {['new_follower', 'follow_accepted'].includes(notif.type) && notif.fromUid && (
                  <button onClick={() => { onViewUser && onViewUser(notif.fromUid); onClose() }} style={{
                    marginTop: 8, padding: '6px 12px', borderRadius: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    color: 'var(--muted)', fontFamily: "'Inter',sans-serif",
                    fontWeight: 600, fontSize: 11, cursor: 'pointer',
                  }}>Ver perfil</button>
                )}

                {/* CTA para promo */}
                {notif.type === 'promo' && notif.data?.cta && (
                  <div style={{
                    marginTop: 10, padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)',
                    fontSize: 12, color: '#f59e0b', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    🎁 {notif.data.cta}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 10, color: 'var(--dim)', flexShrink: 0, paddingTop: 2 }}>
                {timeAgo(notif.ts)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
