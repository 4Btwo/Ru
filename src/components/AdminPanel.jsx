// ── PAINEL ADMIN ───────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react'
import { ref, onValue, update, remove, get, query, orderByChild, endAt } from 'firebase/database'
import { db } from '../lib/firebase'
import { EVENT_META, LOCATIONS } from '../lib/constants'

const C = {
  bg:      '#0d0d15',
  surface: '#12121a',
  s2:      '#1a1a26',
  border:  '#1e1e30',
  border2: '#2a2a3d',
  red:     '#ff2d55',
  green:   '#00ff88',
  yellow:  '#ffcc00',
  blue:    '#4d9fff',
  muted:   '#6666aa',
  dim:     '#3a3a5a',
  text:    '#f0f0ff',
}

const STATUS_COLORS = {
  pending:  { color: C.yellow, bg:'rgba(255,204,0,.12)',  label:'Pendente'  },
  approved: { color: C.green,  bg:'rgba(0,255,136,.10)', label:'Aprovado'  },
  rejected: { color: C.red,    bg:'rgba(255,45,85,.10)', label:'Rejeitado' },
}

const MAIN_TABS = [
  { id:'reports',    label:'📊 Reports',      color: C.red    },
  { id:'moderation', label:'🛡️ Moderação',    color: C.yellow },
  { id:'base',       label:'📍 Locais Base',  color: C.blue   },
  { id:'reset',      label:'🔄 Reset',        color:'#bf5fff' },
]

export default function AdminPanel({ open, onClose, adminUid }) {
  const [mainTab,       setMainTab]      = useState('reports')
  const [modTab,        setModTab]       = useState('pending')
  const [places,        setPlaces]       = useState([])
  const [events,        setEvents]       = useState([])
  const [allPlaces,     setAllPlaces]    = useState([])
  const [hiddenIds,     setHiddenIds]    = useState(new Set())
  const [busy,          setBusy]         = useState(null)
  const [reportFilter,  setReportFilter] = useState('all')
  const [resetBusy,     setResetBusy]    = useState(false)
  const [resetMsg,      setResetMsg]     = useState(null)

  useEffect(() => {
    if (!open) return

    const unsubPlaces = onValue(ref(db, 'places'), snap => {
      const data = snap.val()
      if (!data) { setPlaces([]); setAllPlaces([]); return }
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }))
      setAllPlaces(list)
      setPlaces(list.filter(p =>
        p.needsModeration === true ||
        p.cat === 'noturno'         ||
        p.cat === 'estabelecimento'
      ))
    })

    const unsubEvents = onValue(ref(db, 'events'), snap => {
      const data = snap.val()
      if (!data) return setEvents([])
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 200)
      setEvents(list)
    })

    // Ouve quais locais base estão ocultos
    const unsubHidden = onValue(ref(db, 'settings/hiddenLocations'), snap => {
      const data = snap.val()
      setHiddenIds(data ? new Set(Object.keys(data).filter(k => data[k])) : new Set())
    }, () => {})

    return () => { unsubPlaces(); unsubEvents(); unsubHidden() }
  }, [open])

  // ── Moderação ──────────────────────────────────────────────────────────────
  const pending  = places.filter(p => !p.status || p.status === 'pending')
  const approved = places.filter(p => p.status === 'approved')
  const rejected = places.filter(p => p.status === 'rejected')
  const modList  = { pending, approved, rejected }[modTab]

  const approve     = async (p) => { setBusy(p.id); await update(ref(db, `places/${p.id}`), { status:'approved', approvedBy:adminUid, approvedAt:Date.now() }); setBusy(null) }
  const reject      = async (p) => { setBusy(p.id); await update(ref(db, `places/${p.id}`), { status:'rejected', rejectedBy:adminUid, rejectedAt:Date.now() }); setBusy(null) }
  const restore     = async (p) => { setBusy(p.id); await update(ref(db, `places/${p.id}`), { status:'pending' }); setBusy(null) }
  const deletePlace = async (p) => {
    if (!confirm(`Remover "${p.name}" permanentemente?`)) return
    setBusy(p.id)
    try {
      await remove(ref(db, `places/${p.id}`))
    } catch (err) {
      alert(`Erro ao remover local: ${err.message}\n\nVerifique se você é admin ou se as regras do Firebase foram atualizadas.`)
    } finally {
      setBusy(null)
    }
  }
  const deleteEvent = async (ev) => {
    if (!confirm('Remover este reporte?')) return
    try {
      await remove(ref(db, `events/${ev.id}`))
    } catch (err) {
      alert(`Erro ao remover reporte: ${err.message}`)
    }
  }

  // ── Locais Base (hardcoded) ────────────────────────────────────────────────
  const hideBase = async (loc) => {
    if (!confirm(`Ocultar "${loc.name}" do mapa para todos os usuários?`)) return
    setBusy(loc.id)
    await update(ref(db, 'settings/hiddenLocations'), { [loc.id]: true })
    setBusy(null)
  }
  const restoreBase = async (loc) => {
    setBusy(loc.id)
    await update(ref(db, 'settings/hiddenLocations'), { [loc.id]: null })
    setBusy(null)
  }

  // ── Reset de Reports ───────────────────────────────────────────────────────
  const doReset = useCallback(async (mode) => {
    const labels = {
      transito:  'zerar todos os reports de trânsito?',
      noturno:   'zerar todos os reports noturnos?',
      all:       'ZERAR TODOS OS REPORTS do banco?\n\nEsta ação não pode ser desfeita.',
      old:       'remover reports com mais de 6 horas?',
    }
    if (!confirm(labels[mode])) return
    setResetBusy(true)
    setResetMsg(null)

    try {
      const snap = await get(ref(db, 'events'))
      if (!snap.exists()) { setResetMsg('Nenhum report encontrado.'); setResetBusy(false); return }

      const now    = Date.now()
      const sixH   = 6 * 60 * 60 * 1000
      const transitTypes  = new Set(['pesado','bloqueio','acidente','blitz'])
      const noturnoTypes  = new Set(['cheio','evento','morto'])

      const toDelete = {}
      snap.forEach(child => {
        const ev = child.val()
        if (mode === 'all')     toDelete[child.key] = null
        if (mode === 'transito' && transitTypes.has(ev.type))  toDelete[child.key] = null
        if (mode === 'noturno'  && noturnoTypes.has(ev.type))  toDelete[child.key] = null
        if (mode === 'old'      && (now - ev.ts) > sixH)       toDelete[child.key] = null
      })

      const count = Object.keys(toDelete).length
      if (count === 0) { setResetMsg('Nenhum report corresponde ao filtro.'); setResetBusy(false); return }

      await update(ref(db, 'events'), toDelete)
      setResetMsg(`✅ ${count} report${count !== 1 ? 's' : ''} removido${count !== 1 ? 's' : ''} com sucesso.`)
    } catch (e) {
      setResetMsg(`❌ Erro: ${e.message}`)
    }
    setResetBusy(false)
  }, [])

  // ── Filtros de reports ─────────────────────────────────────────────────────
  const filteredEvents = reportFilter === 'all'
    ? events
    : events.filter(ev => {
        if (reportFilter === 'transito') return ['pesado','bloqueio','acidente','blitz'].includes(ev.type)
        if (reportFilter === 'noturno')  return ['cheio','evento','morto'].includes(ev.type)
        return true
      })

  const pendingCount = pending.length

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2400,
        background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)',
        opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
        transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', inset:0, zIndex:2500,
        background: C.bg,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
        display:'flex', flexDirection:'column',
        fontFamily:"'Syne',sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px 0',
          borderBottom:`1px solid ${C.border}`,
          background: C.bg,
          flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background:'rgba(255,45,85,.15)', border:'1px solid rgba(255,45,85,.3)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
              }}>🛡️</div>
              <div>
                <div style={{ fontSize:16, fontWeight:800 }}>Painel Admin</div>
                <div style={{ fontSize:11, color: C.muted, marginTop:1 }}>
                  {events.length} reports · {places.length} locais · {hiddenIds.size} ocultos
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width:36, height:36, borderRadius:10,
              background: C.s2, border:`1px solid ${C.border2}`,
              cursor:'pointer', color: C.muted, fontSize:16,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>✕</button>
          </div>

          {/* Tabs principais */}
          <div style={{ display:'flex', gap:2, overflowX:'auto' }}>
            {MAIN_TABS.map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id)} style={{
                flex:1, padding:'10px 4px', border:'none', minWidth:0,
                borderBottom: mainTab===t.id ? `2px solid ${t.color}` : '2px solid transparent',
                background:'transparent', cursor:'pointer',
                fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
                color: mainTab===t.id ? t.color : '#4a4a6a',
                transition:'all .2s', whiteSpace:'nowrap',
              }}>
                {t.label}
                {t.id === 'moderation' && pendingCount > 0 && (
                  <span style={{
                    marginLeft:4, background: C.red, color:'#fff',
                    fontSize:9, fontWeight:800, borderRadius:'50%',
                    width:15, height:15, display:'inline-flex',
                    alignItems:'center', justifyContent:'center',
                  }}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>

          {/* ── REPORTS ─────────────────────────────────────────────────────── */}
          {mainTab === 'reports' && (
            <>
              <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
                {[
                  { id:'all',      label:'🗺️ Todos' },
                  { id:'transito', label:'🚦 Trânsito' },
                  { id:'noturno',  label:'🌙 Noturno' },
                ].map(f => (
                  <button key={f.id} onClick={() => setReportFilter(f.id)} style={{
                    padding:'5px 12px', borderRadius:20,
                    background: reportFilter===f.id ? 'rgba(255,45,85,.15)' : C.s2,
                    border:`1px solid ${reportFilter===f.id ? C.red : C.border2}`,
                    color: reportFilter===f.id ? C.red : C.muted,
                    fontFamily:"'Syne',sans-serif", fontWeight:600, fontSize:11, cursor:'pointer',
                  }}>{f.label}</button>
                ))}
                <div style={{ marginLeft:'auto', fontSize:11, color: C.dim, alignSelf:'center' }}>
                  {filteredEvents.length} reports
                </div>
              </div>

              {filteredEvents.length === 0
                ? <EmptyState icon="📊" title="Nenhum reporte" sub="Os reports aparecem aqui em tempo real" />
                : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {filteredEvents.map(ev => {
                      const meta  = EVENT_META[ev.type]
                      const place = allPlaces.find(p => p.id === ev.locationId)
                      const mins  = Math.round((Date.now() - ev.ts) / 60000)
                      const timeStr = mins === 0 ? 'agora' : mins < 60 ? `há ${mins}min` : `há ${Math.floor(mins/60)}h`
                      return (
                        <div key={ev.id} style={{
                          background: C.surface, border:`1px solid ${C.border}`,
                          borderRadius:12, padding:'12px 14px',
                          display:'flex', alignItems:'center', gap:10,
                        }}>
                          <div style={{
                            width:36, height:36, borderRadius:9, flexShrink:0,
                            background:`${meta?.color || '#333'}20`,
                            border:`1px solid ${meta?.color || '#333'}44`,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                          }}>
                            {meta?.emoji || '📍'}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                              <span style={{ fontSize:12, fontWeight:700, color: meta?.color }}>{meta?.label || ev.type}</span>
                              {ev.isConfirmation && <MiniTag label="CONFIRMAÇÃO" color={C.green} />}
                              {ev.isResolution   && <MiniTag label="RESOLUÇÃO"   color={C.green} />}
                            </div>
                            <div style={{ fontSize:11, color: C.muted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              📍 {place?.name || ev.locationId} · 👤 {ev.userName || 'Anônimo'} · {timeStr}
                            </div>
                          </div>
                          <button onClick={() => deleteEvent(ev)} style={{
                            width:28, height:28, borderRadius:8, border:'1px solid rgba(255,45,85,.25)',
                            background:'rgba(255,45,85,.08)', color: C.red,
                            cursor:'pointer', fontSize:12, flexShrink:0,
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>🗑</button>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </>
          )}

          {/* ── MODERAÇÃO ───────────────────────────────────────────────────── */}
          {mainTab === 'moderation' && (
            <>
              <InfoBanner color={C.yellow} text="Apenas locais fixos (bares, baladas, estabelecimentos) passam por moderação." />

              <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                {[
                  { id:'pending',  label:'Pendentes', count:pending.length,  color: C.yellow },
                  { id:'approved', label:'Aprovados', count:approved.length, color: C.green  },
                  { id:'rejected', label:'Rejeitados',count:rejected.length, color: C.red    },
                ].map(t => (
                  <button key={t.id} onClick={() => setModTab(t.id)} style={{
                    flex:1, padding:'8px 4px', borderRadius:10,
                    background: modTab===t.id ? `${t.color}18` : C.s2,
                    border:`1px solid ${modTab===t.id ? t.color : C.border2}`,
                    color: modTab===t.id ? t.color : '#4a4a6a',
                    fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:11, cursor:'pointer',
                    transition:'all .2s',
                  }}>
                    {t.label}{t.count > 0 && <span style={{ marginLeft:4, fontSize:10, opacity:.8 }}>({t.count})</span>}
                  </button>
                ))}
              </div>

              {modList.length === 0
                ? <EmptyState icon={modTab==='pending' ? '✅' : '🏪'} title="Nada aqui" sub="Tudo em ordem!" />
                : (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {modList.map(place => (
                      <PlaceCard
                        key={place.id} place={place} tab={modTab}
                        busy={busy === place.id}
                        onApprove={() => approve(place)} onReject={() => reject(place)}
                        onDelete={() => deletePlace(place)} onRestore={() => restore(place)}
                      />
                    ))}
                  </div>
                )
              }
            </>
          )}

          {/* ── LOCAIS BASE ─────────────────────────────────────────────────── */}
          {mainTab === 'base' && (
            <>
              <InfoBanner
                color={C.blue}
                text='Locais hardcoded no código. "Ocultar" remove do mapa para todos sem alterar o código. "Restaurar" os traz de volta.'
              />
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {LOCATIONS.map(loc => {
                  const hidden = hiddenIds.has(loc.id)
                  const isBusy = busy === loc.id
                  return (
                    <div key={loc.id} style={{
                      background: C.surface, border:`1px solid ${hidden ? 'rgba(255,45,85,.3)' : C.border}`,
                      borderRadius:12, padding:'12px 14px',
                      display:'flex', alignItems:'center', gap:12,
                      opacity: isBusy ? .5 : 1, transition:'opacity .2s',
                    }}>
                      <div style={{
                        width:34, height:34, borderRadius:9, flexShrink:0,
                        background: loc.cat==='transito' ? 'rgba(255,107,53,.15)' : 'rgba(191,95,255,.15)',
                        border:`1px solid ${loc.cat==='transito' ? 'rgba(255,107,53,.3)' : 'rgba(191,95,255,.3)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                      }}>
                        {loc.cat === 'transito' ? '🚦' : '🌙'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color: hidden ? C.muted : C.text }}>
                          {loc.name}
                          {hidden && <span style={{ marginLeft:8, fontSize:10, color: C.red }}>OCULTO</span>}
                        </div>
                        <div style={{ fontSize:11, color: C.muted, marginTop:2 }}>
                          ID {loc.id} · {loc.cat} · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </div>
                      </div>
                      {hidden ? (
                        <ActionBtn
                          color={C.green} bg="rgba(0,255,136,.1)"
                          label="↩️ Restaurar"
                          onClick={() => restoreBase(loc)}
                          disabled={isBusy}
                        />
                      ) : (
                        <ActionBtn
                          color={C.red} bg="rgba(255,45,85,.08)"
                          label="🙈 Ocultar"
                          onClick={() => hideBase(loc)}
                          disabled={isBusy}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── RESET DE REPORTS ────────────────────────────────────────────── */}
          {mainTab === 'reset' && (
            <>
              <InfoBanner
                color="#bf5fff"
                text="Zerá reports do banco. Ideal para rodar de madrugada ou quando o período de reports já encerrou. A Cloud Function já faz limpeza automática às 6h e às 12h, mas aqui você pode agir manualmente."
              />

              {resetMsg && (
                <div style={{
                  background: resetMsg.startsWith('✅') ? 'rgba(0,255,136,.08)' : 'rgba(255,45,85,.08)',
                  border:`1px solid ${resetMsg.startsWith('✅') ? 'rgba(0,255,136,.25)' : 'rgba(255,45,85,.25)'}`,
                  borderRadius:10, padding:'10px 14px', marginBottom:16,
                  fontSize:13, color: resetMsg.startsWith('✅') ? C.green : C.red,
                }}>{resetMsg}</div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <ResetCard
                  icon="🚦" title="Zerar Trânsito"
                  desc="Remove todos os reports de trânsito, bloqueio, acidente e blitz."
                  color={C.yellow} busy={resetBusy}
                  onClick={() => doReset('transito')}
                />
                <ResetCard
                  icon="🌙" title="Zerar Noturno"
                  desc="Remove todos os reports de lotação, eventos e vazio (bares/baladas)."
                  color="#bf5fff" busy={resetBusy}
                  onClick={() => doReset('noturno')}
                />
                <ResetCard
                  icon="⏱️" title="Limpar Antigos (+ 6h)"
                  desc="Remove apenas reports com mais de 6 horas — mantém os recentes."
                  color={C.blue} busy={resetBusy}
                  onClick={() => doReset('old')}
                />
                <ResetCard
                  icon="💥" title="Zerar Tudo"
                  desc="Remove TODOS os reports do banco. Use só se necessário."
                  color={C.red} busy={resetBusy}
                  onClick={() => doReset('all')}
                  danger
                />
              </div>

              {/* Info sobre reset automático */}
              <div style={{
                marginTop:24, background: C.surface,
                border:`1px solid ${C.border}`,
                borderRadius:12, padding:'14px 16px',
              }}>
                <div style={{ fontSize:12, fontWeight:700, color: C.muted, marginBottom:10, textTransform:'uppercase', letterSpacing:'.06em' }}>
                  ⏰ Reset automático (Cloud Functions)
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { time:'6h da manhã',   desc:'Zera trânsito + eventos noturnos encerrados' },
                    { time:'12h do meio-dia', desc:'Zera trânsito com mais de 4 horas' },
                    { time:'A cada hora',   desc:'Remove reports expirados pelo tempo natural' },
                  ].map((r, i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <span style={{
                        flexShrink:0, background:'rgba(0,255,136,.1)',
                        border:'1px solid rgba(0,255,136,.2)',
                        borderRadius:8, padding:'2px 8px',
                        fontSize:10, fontWeight:700, color: C.green,
                      }}>{r.time}</span>
                      <span style={{ fontSize:12, color: C.muted, lineHeight:1.5 }}>{r.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'#3a3a5a' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12 }}>{sub}</div>
    </div>
  )
}

function InfoBanner({ color, text }) {
  return (
    <div style={{
      background:`${color}0f`, border:`1px solid ${color}33`,
      borderRadius:10, padding:'10px 14px', marginBottom:16,
      fontSize:12, color, display:'flex', gap:8, alignItems:'flex-start', lineHeight:1.6,
    }}>
      <span>ℹ️</span><span>{text}</span>
    </div>
  )
}

function MiniTag({ label, color }) {
  return (
    <span style={{
      fontSize:9, background:`${color}20`, color,
      borderRadius:8, padding:'1px 6px',
    }}>{label}</span>
  )
}

function ResetCard({ icon, title, desc, color, busy, onClick, danger }) {
  return (
    <div style={{
      background: danger ? 'rgba(255,45,85,.04)' : '#12121a',
      border:`1px solid ${danger ? 'rgba(255,45,85,.2)' : '#1e1e30'}`,
      borderRadius:14, padding:'16px',
      display:'flex', alignItems:'center', gap:14,
    }}>
      <div style={{
        width:40, height:40, borderRadius:10, flexShrink:0,
        background:`${color}18`, border:`1px solid ${color}33`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
      }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color: danger ? '#ff2d55' : '#f0f0ff', marginBottom:3 }}>{title}</div>
        <div style={{ fontSize:11, color:'#6666aa', lineHeight:1.5 }}>{desc}</div>
      </div>
      <button
        onClick={onClick}
        disabled={busy}
        style={{
          flexShrink:0, padding:'8px 14px', borderRadius:10,
          background:`${color}18`, border:`1px solid ${color}44`,
          color, cursor: busy ? 'wait' : 'pointer',
          fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
          opacity: busy ? .5 : 1, transition:'all .15s',
        }}
      >
        {busy ? '...' : 'Executar'}
      </button>
    </div>
  )
}

function PlaceCard({ place, tab, busy, onApprove, onReject, onDelete, onRestore }) {
  const ts = place.createdAt ? new Date(place.createdAt).toLocaleDateString('pt-BR') : '—'
  const sc = STATUS_COLORS[place.status || 'pending']
  const catEmoji = place.cat === 'noturno' ? '🌙' : place.cat === 'estabelecimento' ? '🏪' : '🚦'

  return (
    <div style={{
      background:'#12121a', border:'1px solid #1e1e30',
      borderRadius:16, padding:'16px',
      opacity: busy ? 0.6 : 1, transition:'opacity .2s',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ flex:1, paddingRight:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:20 }}>{catEmoji}</span>
            <span style={{ fontSize:15, fontWeight:800 }}>{place.name}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            <Tag icon="👤" label={place.createdName || 'Anônimo'} />
            <Tag icon="📅" label={ts} />
            <Tag icon="📍" label={`${place.lat?.toFixed(4)}, ${place.lng?.toFixed(4)}`} mono />
          </div>
        </div>
        <div style={{
          flexShrink:0, background:sc.bg, border:`1px solid ${sc.color}44`,
          borderRadius:20, padding:'4px 10px',
          fontSize:10, fontWeight:800, color:sc.color, letterSpacing:'.06em',
        }}>{sc.label}</div>
      </div>

      <div style={{ display:'flex', gap:8 }}>
        {tab === 'pending'  && <><ActionBtn color="#00ff88" bg="rgba(0,255,136,.12)" label="✅ Aprovar"  onClick={onApprove} disabled={busy} /><ActionBtn color="#ff2d55" bg="rgba(255,45,85,.12)" label="❌ Rejeitar" onClick={onReject} disabled={busy} /></>}
        {tab === 'approved' && <><ActionBtn color="#ff6b35" bg="rgba(255,107,53,.12)" label="↩️ Rever"  onClick={onRestore} disabled={busy} /><ActionBtn color="#ff2d55" bg="rgba(255,45,85,.08)" label="🗑️ Remover" onClick={onDelete} disabled={busy} /></>}
        {tab === 'rejected' && <><ActionBtn color="#00ff88" bg="rgba(0,255,136,.08)" label="↩️ Reabrir" onClick={onRestore} disabled={busy} /><ActionBtn color="#ff2d55" bg="rgba(255,45,85,.08)" label="🗑️ Remover" onClick={onDelete} disabled={busy} /></>}
      </div>
    </div>
  )
}

function Tag({ icon, label, mono }) {
  return (
    <span style={{
      background:'#1a1a26', border:'1px solid #2a2a3d',
      borderRadius:20, padding:'3px 10px',
      fontSize:11, color:'#6666aa',
      fontFamily: mono ? "'Space Mono',monospace" : "'Syne',sans-serif",
    }}>
      {icon} {label}
    </span>
  )
}

function ActionBtn({ color, bg, label, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex:1, padding:'10px 8px', borderRadius:10, border:`1px solid ${color}44`,
      background:bg, color, cursor:disabled ? 'wait' : 'pointer',
      fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:12,
      transition:'all .15s', opacity:disabled ? .5 : 1,
    }}
      onMouseDown={e  => !disabled && (e.currentTarget.style.transform='scale(.97)')}
      onMouseUp={e    => (e.currentTarget.style.transform='scale(1)')}
      onTouchStart={e => !disabled && (e.currentTarget.style.transform='scale(.97)')}
      onTouchEnd={e   => (e.currentTarget.style.transform='scale(1)')}
    >
      {label}
    </button>
  )
}
