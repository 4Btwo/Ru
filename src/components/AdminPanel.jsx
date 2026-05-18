import React, { useState, useEffect, useCallback } from 'react'
import { ref, onValue, update, remove, get } from 'firebase/database'
import { db } from '../lib/firebase'
import { EVENT_META } from '../lib/constants'

const T = { muted:'rgba(240,240,255,0.38)', text:'#f0f0ff', dim:'rgba(240,240,255,0.16)', border:'rgba(255,255,255,0.07)', surface:'rgba(255,255,255,0.04)' }

const STATUS_CFG = {
  pending:  { c:'#ffd32a', bg:'rgba(255,211,42,0.1)',  l:'Pendente' },
  approved: { c:'#00f5a0', bg:'rgba(0,245,160,0.08)',  l:'Aprovado' },
  rejected: { c:'#ff4757', bg:'rgba(255,71,87,0.08)',  l:'Rejeitado'},
}

function InfoBanner({color,text}) {
  return <div style={{background:`${color}0e`,border:`1px solid ${color}33`,borderRadius:14,padding:'11px 14px',marginBottom:16,fontSize:12,color,display:'flex',gap:8,alignItems:'flex-start',lineHeight:1.6}}><span>ℹ️</span><span>{text}</span></div>
}
function Empty({icon,title,sub}) {
  return <div style={{textAlign:'center',padding:'56px 0',color:T.muted}}><div style={{fontSize:40,marginBottom:12}}>{icon}</div><div style={{fontSize:14,fontWeight:700,marginBottom:4,color:'rgba(240,240,255,0.5)'}}>{title}</div><div style={{fontSize:12}}>{sub}</div></div>
}
function MiniTag({label,color}) {
  return <span style={{fontSize:9,background:`${color}1a`,color,borderRadius:8,padding:'1px 7px',fontWeight:700}}>{label}</span>
}
function ActionBtn({label,color,bg,onClick,disabled,small}) {
  return <button onClick={onClick} disabled={disabled} style={{flex:small?'none':1,padding:small?'6px 12px':'10px',borderRadius:12,background:bg,border:`1px solid ${color}44`,color,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:small?10:12,cursor:disabled?'wait':'pointer',opacity:disabled?.5:1,transition:'all .15s',whiteSpace:'nowrap'}}>{label}</button>
}

function PlaceCard({place,tab,busy,onApprove,onReject,onDelete,onRestore}) {
  const s  = STATUS_CFG[place.status||'pending']
  const ts = place.createdAt?new Date(place.createdAt).toLocaleDateString('pt-BR'):'—'
  const em = {noturno:'🌙',estabelecimento:'🏪',transito:'🚦',bar:'🍺',parque:'🌿',show:'🎭'}[place.cat]||'📍'
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:20,padding:16,opacity:busy?.5:1,transition:'opacity .2s'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
        <div style={{flex:1,paddingRight:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <div style={{width:38,height:38,borderRadius:11,flexShrink:0,background:'rgba(79,142,255,0.1)',border:'1px solid rgba(79,142,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{em}</div>
            <div><div style={{fontSize:14,fontWeight:800,color:T.text}}>{place.name}</div><div style={{fontSize:11,color:T.muted}}>{place.cat} · {ts}</div></div>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {place.createdName&&<span style={{fontSize:10,background:T.surface,border:`1px solid ${T.border}`,borderRadius:999,padding:'2px 8px',color:T.muted}}>👤 {place.createdName}</span>}
            <span style={{fontSize:10,background:T.surface,border:`1px solid ${T.border}`,borderRadius:999,padding:'2px 8px',color:T.muted,fontFamily:"'Space Mono',monospace"}}>{place.lat?.toFixed(4)}, {place.lng?.toFixed(4)}</span>
          </div>
        </div>
        <div style={{flexShrink:0,background:s.bg,border:`1px solid ${s.c}44`,borderRadius:999,padding:'4px 11px',fontSize:10,fontWeight:800,color:s.c}}>{s.l}</div>
      </div>
      <div style={{display:'flex',gap:8}}>
        {tab==='pending'  && <><ActionBtn color='#00f5a0' bg='rgba(0,245,160,0.1)'  label='✅ Aprovar'  onClick={onApprove} disabled={busy}/><ActionBtn color='#ff4757' bg='rgba(255,71,87,0.1)'  label='❌ Rejeitar' onClick={onReject}  disabled={busy}/></>}
        {tab==='approved' && <><ActionBtn color='#ff6b35' bg='rgba(255,107,53,0.1)' label='↩️ Rever'    onClick={onRestore} disabled={busy}/><ActionBtn color='#ff4757' bg='rgba(255,71,87,0.08)'  label='🗑️ Remover'  onClick={onDelete}  disabled={busy}/></>}
        {tab==='rejected' && <><ActionBtn color='#00f5a0' bg='rgba(0,245,160,0.08)' label='↩️ Reabrir'  onClick={onRestore} disabled={busy}/><ActionBtn color='#ff4757' bg='rgba(255,71,87,0.08)'  label='🗑️ Remover'  onClick={onDelete}  disabled={busy}/></>}
      </div>
    </div>
  )
}

function ResetCard({icon,title,desc,color,busy,onClick,danger}) {
  return (
    <div style={{background:danger?'rgba(255,71,87,0.04)':T.surface,border:`1px solid ${danger?'rgba(255,71,87,0.2)':T.border}`,borderRadius:18,padding:16,display:'flex',alignItems:'center',gap:14}}>
      <div style={{width:44,height:44,borderRadius:14,flexShrink:0,background:`${color}14`,border:`1px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{icon}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:700,color:danger?'#ff4757':T.text,marginBottom:3}}>{title}</div>
        <div style={{fontSize:11,color:T.muted,lineHeight:1.5}}>{desc}</div>
      </div>
      <button onClick={onClick} disabled={busy} style={{flexShrink:0,padding:'9px 16px',borderRadius:12,background:`${color}14`,border:`1px solid ${color}44`,color,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:busy?'wait':'pointer',opacity:busy?.5:1,transition:'all .15s'}}>{busy?'...':'Executar'}</button>
    </div>
  )
}

const MAIN_TABS = [{id:'reports',l:'📊 Reports',c:'#ff4757'},{id:'moderation',l:'🛡️ Moderação',c:'#ffd32a'},{id:'base',l:'📍 Locais',c:'#4f8eff'},{id:'reset',l:'🔄 Reset',c:'#7c5cfc'}]

export default function AdminPanel({open, onClose, adminUid}) {
  const [mainTab,      setMainTab]     = useState('reports')
  const [modTab,       setModTab]      = useState('pending')
  const [places,       setPlaces]      = useState([])
  const [events,       setEvents]      = useState([])
  const [allPlaces,    setAllPlaces]   = useState([])
  const [hiddenIds,    setHiddenIds]   = useState(new Set())
  const [busy,         setBusy]        = useState(null)
  const [reportFilter, setRFilt]       = useState('all')
  const [resetBusy,    setResetBusy]   = useState(false)
  const [resetMsg,     setResetMsg]    = useState(null)

  useEffect(()=>{
    if (!open) return
    const u1=onValue(ref(db,'places'),snap=>{const d=snap.val()||{};const list=Object.entries(d).map(([id,v])=>({id,...v}));setAllPlaces(list);setPlaces(list.filter(p=>p.needsModeration||['noturno','estabelecimento'].includes(p.cat)))})
    const u2=onValue(ref(db,'events'),snap=>{if(!snap.exists())return setEvents([]);setEvents(Object.entries(snap.val()).map(([id,v])=>({id,...v})).sort((a,b)=>b.ts-a.ts).slice(0,200))})
    const u3=onValue(ref(db,'settings/hiddenLocations'),snap=>{const d=snap.val();setHiddenIds(d?new Set(Object.keys(d).filter(k=>d[k])):new Set())},()=>{})
    return()=>{u1();u2();u3()}
  },[open])

  const pending  = places.filter(p=>!p.status||p.status==='pending')
  const approved = places.filter(p=>p.status==='approved')
  const rejected = places.filter(p=>p.status==='rejected')
  const modList  = {pending,approved,rejected}[modTab]

  const approve     = async p=>{setBusy(p.id);await update(ref(db,`places/${p.id}`),{status:'approved',approvedBy:adminUid,approvedAt:Date.now()});setBusy(null)}
  const reject      = async p=>{setBusy(p.id);await update(ref(db,`places/${p.id}`),{status:'rejected',rejectedBy:adminUid,rejectedAt:Date.now()});setBusy(null)}
  const restore     = async p=>{setBusy(p.id);await update(ref(db,`places/${p.id}`),{status:'pending'});setBusy(null)}
  const deletePlace = async p=>{if(!confirm(`Remover "${p.name}" permanentemente?`))return;setBusy(p.id);try{await remove(ref(db,`places/${p.id}`))}catch(e){alert(`Erro: ${e.message}`)}finally{setBusy(null)}}
  const deleteEvent = async ev=>{if(!confirm('Remover este reporte?'))return;try{await remove(ref(db,`events/${ev.id}`))}catch(e){alert(`Erro: ${e.message}`)}}

  const doReset = useCallback(async mode=>{
    const labels={transito:'zerar todos os reports de trânsito?',noturno:'zerar todos os reports noturnos?',all:'ZERAR TODOS OS REPORTS?\n\nNão pode ser desfeito.',old:'remover reports com mais de 6 horas?'}
    if(!confirm(labels[mode])) return
    setResetBusy(true);setResetMsg(null)
    try{
      const snap=await get(ref(db,'events'))
      if(!snap.exists()){setResetMsg('Nenhum report encontrado.');setResetBusy(false);return}
      const now=Date.now(),sixH=6*3600000
      const tran=new Set(['pesado','bloqueio','acidente','blitz']),not=new Set(['cheio','evento','morto'])
      const del={}
      snap.forEach(c=>{const v=c.val();if(mode==='all')del[c.key]=null;if(mode==='transito'&&tran.has(v.type))del[c.key]=null;if(mode==='noturno'&&not.has(v.type))del[c.key]=null;if(mode==='old'&&(now-v.ts)>sixH)del[c.key]=null})
      const cnt=Object.keys(del).length
      if(!cnt){setResetMsg('Nenhum report corresponde.');setResetBusy(false);return}
      await update(ref(db,'events'),del)
      setResetMsg(`✅ ${cnt} report${cnt!==1?'s':''} removido${cnt!==1?'s':''}.`)
    }catch(e){setResetMsg(`❌ Erro: ${e.message}`)}
    setResetBusy(false)
  },[])

  const filteredEvents = reportFilter==='all' ? events : events.filter(ev=>{if(reportFilter==='transito')return['pesado','bloqueio','acidente','blitz'].includes(ev.type);if(reportFilter==='noturno')return['cheio','evento','morto'].includes(ev.type);return true})

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:2400,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
      <div style={{position:'fixed',inset:0,zIndex:2500,background:'#080810',display:'flex',flexDirection:'column',fontFamily:"'DM Sans',sans-serif",transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)'}}>

        {/* Header */}
        <div style={{padding:'calc(16px + env(safe-area-inset-top,0px)) 20px 0',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'rgba(8,8,20,0.97)',backdropFilter:'blur(32px)',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:12,background:'rgba(255,71,87,0.12)',border:'1px solid rgba(255,71,87,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🛡️</div>
              <div>
                <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,letterSpacing:'-.02em',color:T.text}}>Painel Admin</div>
                <div style={{fontSize:11,color:T.muted,marginTop:1}}>{events.length} reports · {places.length} locais · {hiddenIds.size} ocultos</div>
              </div>
            </div>
            <button onClick={onClose} style={{width:36,height:36,borderRadius:'50%',background:T.surface,border:`1px solid ${T.border}`,cursor:'pointer',color:T.muted,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
          <div style={{display:'flex',gap:0,overflowX:'auto',scrollbarWidth:'none'}}>
            {MAIN_TABS.map(t=>(
              <button key={t.id} onClick={()=>setMainTab(t.id)} style={{flex:1,padding:'10px 4px',border:'none',minWidth:0,borderBottom:`2px solid ${mainTab===t.id?t.c:'transparent'}`,background:'transparent',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,color:mainTab===t.id?t.c:'rgba(240,240,255,0.38)',transition:'all .2s',whiteSpace:'nowrap',position:'relative'}}>
                {t.l}
                {t.id==='moderation'&&pending.length>0&&<span style={{marginLeft:4,background:'#ff4757',color:'#fff',fontSize:9,fontWeight:800,borderRadius:'50%',width:15,height:15,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>{pending.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'16px 20px',paddingBottom:'calc(24px + env(safe-area-inset-bottom,0px))'}}>

          {/* REPORTS */}
          {mainTab==='reports'&&(
            <>
              <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
                {[{id:'all',l:'🗺️ Todos'},{id:'transito',l:'🚦 Trânsito'},{id:'noturno',l:'🌙 Noturno'}].map(f=>(
                  <button key={f.id} onClick={()=>setRFilt(f.id)} style={{padding:'6px 14px',borderRadius:999,background:reportFilter===f.id?'rgba(255,71,87,0.12)':T.surface,border:`1px solid ${reportFilter===f.id?'rgba(255,71,87,0.4)':T.border}`,color:reportFilter===f.id?'#ff4757':T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,cursor:'pointer'}}>{f.l}</button>
                ))}
                <div style={{marginLeft:'auto',fontSize:11,color:T.dim,fontFamily:"'Space Mono',monospace"}}>{filteredEvents.length}</div>
              </div>
              {filteredEvents.length===0 ? <Empty icon="📊" title="Nenhum reporte" sub="Os reports aparecem aqui em tempo real"/>
              : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {filteredEvents.map(ev=>{
                  const meta=EVENT_META[ev.type]
                  const place=allPlaces.find(p=>p.id===ev.locationId)
                  const mins=Math.round((Date.now()-ev.ts)/60000)
                  const t=mins===0?'agora':mins<60?`${mins}min`:`${Math.floor(mins/60)}h`
                  return (
                    <div key={ev.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:40,height:40,borderRadius:12,flexShrink:0,background:`${meta?.color||'#333'}18`,border:`1px solid ${meta?.color||'#333'}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{meta?.emoji||'📍'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                          <span style={{fontSize:12,fontWeight:700,color:meta?.color}}>{meta?.label||ev.type}</span>
                          {ev.isConfirmation&&<MiniTag label="CONFIRM" color="#00f5a0"/>}
                          {ev.isResolution&&  <MiniTag label="RESOLV"  color="#00f5a0"/>}
                        </div>
                        <div style={{fontSize:11,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📍 {place?.name||ev.locationId} · 👤 {ev.userName||'Anônimo'} · {t}</div>
                      </div>
                      <button onClick={()=>deleteEvent(ev)} style={{width:32,height:32,borderRadius:10,border:'1px solid rgba(255,71,87,0.22)',background:'rgba(255,71,87,0.07)',color:'#ff4757',cursor:'pointer',fontSize:13,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑</button>
                    </div>
                  )
                })}
              </div>}
            </>
          )}

          {/* MODERAÇÃO */}
          {mainTab==='moderation'&&(
            <>
              <InfoBanner color="#ffd32a" text="Apenas locais fixos (bares, baladas, estabelecimentos) passam por moderação."/>
              <div style={{display:'flex',gap:6,marginBottom:16}}>
                {[{id:'pending',l:'Pendentes',n:pending.length,c:'#ffd32a'},{id:'approved',l:'Aprovados',n:approved.length,c:'#00f5a0'},{id:'rejected',l:'Rejeitados',n:rejected.length,c:'#ff4757'}].map(t=>(
                  <button key={t.id} onClick={()=>setModTab(t.id)} style={{flex:1,padding:'9px 4px',borderRadius:12,background:modTab===t.id?`${t.c}14`:T.surface,border:`1px solid ${modTab===t.id?t.c:T.border}`,color:modTab===t.id?t.c:T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,cursor:'pointer',transition:'all .2s'}}>
                    {t.l}{t.n>0&&<span style={{marginLeft:4,fontSize:10,opacity:.8}}>({t.n})</span>}
                  </button>
                ))}
              </div>
              {modList.length===0 ? <Empty icon="✅" title="Nada aqui" sub="Tudo em ordem!"/>
              :<div style={{display:'flex',flexDirection:'column',gap:12}}>
                {modList.map(p=>(
                  <PlaceCard key={p.id} place={p} tab={modTab} busy={busy===p.id} onApprove={()=>approve(p)} onReject={()=>reject(p)} onDelete={()=>deletePlace(p)} onRestore={()=>restore(p)}/>
                ))}
              </div>}
            </>
          )}

          {/* LOCAIS */}
          {mainTab==='base'&&(
            <>
              <InfoBanner color="#4f8eff" text="Todos os locais do mapa. Use 🗑️ para remover permanentemente."/>
              {allPlaces.length===0 ? <Empty icon="📍" title="Nenhum local" sub="Os locais aparecem aqui."/>
              :<div style={{display:'flex',flexDirection:'column',gap:8}}>
                {allPlaces.map(loc=>(
                  <div key={loc.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,opacity:busy===loc.id?.5:1,transition:'opacity .2s'}}>
                    <div style={{width:38,height:38,borderRadius:12,flexShrink:0,background:'rgba(79,142,255,0.1)',border:'1px solid rgba(79,142,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{loc.cat==='transito'?'🚦':loc.cat==='noturno'?'🌙':'🏪'}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{loc.name}</div>
                      <div style={{fontSize:11,color:T.muted,fontFamily:"'Space Mono',monospace"}}>{loc.cat} · {Number(loc.lat).toFixed(4)}, {Number(loc.lng).toFixed(4)}</div>
                    </div>
                    <ActionBtn color="#ff4757" bg="rgba(255,71,87,0.08)" label="🗑️ Remover" onClick={()=>deletePlace(loc)} disabled={busy===loc.id} small/>
                  </div>
                ))}
              </div>}
            </>
          )}

          {/* RESET */}
          {mainTab==='reset'&&(
            <>
              <InfoBanner color="#7c5cfc" text="Zera reports do banco. Cloud Functions fazem limpeza automática às 6h e às 12h."/>
              {resetMsg&&<div style={{background:resetMsg.startsWith('✅')?'rgba(0,245,160,0.07)':'rgba(255,71,87,0.07)',border:`1px solid ${resetMsg.startsWith('✅')?'rgba(0,245,160,0.25)':'rgba(255,71,87,0.25)'}`,borderRadius:14,padding:'11px 14px',marginBottom:16,fontSize:13,color:resetMsg.startsWith('✅')?'#00f5a0':'#ff4757'}}>{resetMsg}</div>}
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                <ResetCard icon="🚦" title="Zerar Trânsito"   desc="Remove reports de trânsito, bloqueio, acidente e blitz."    color="#ff6b35" busy={resetBusy} onClick={()=>doReset('transito')}/>
                <ResetCard icon="🌙" title="Zerar Noturno"    desc="Remove reports de lotação, eventos e vazio."                 color="#7c5cfc" busy={resetBusy} onClick={()=>doReset('noturno')}/>
                <ResetCard icon="⏱️" title="Limpar +6h"       desc="Remove apenas reports com mais de 6 horas."                  color="#4f8eff" busy={resetBusy} onClick={()=>doReset('old')}/>
                <ResetCard icon="💥" title="Zerar Tudo"       desc="Remove TODOS os reports. Irreversível."                      color="#ff4757" busy={resetBusy} onClick={()=>doReset('all')} danger/>
              </div>
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:18,padding:16}}>
                <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:T.muted,fontWeight:700,marginBottom:12}}>⏰ Reset automático (Cloud Functions)</div>
                {[{t:'6h da manhã',d:'Zera trânsito + noturno encerrado'},{t:'12h do meio-dia',d:'Zera trânsito com +4h'},{t:'A cada hora',d:'Remove reports expirados'}].map((r,i)=>(
                  <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:8}}>
                    <span style={{flexShrink:0,background:'rgba(0,245,160,0.08)',border:'1px solid rgba(0,245,160,0.2)',borderRadius:8,padding:'2px 9px',fontSize:10,fontWeight:700,color:'#00f5a0',whiteSpace:'nowrap'}}>{r.t}</span>
                    <span style={{fontSize:12,color:T.muted,lineHeight:1.5}}>{r.d}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
