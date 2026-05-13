// ── PAINEL DO DONO ────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react'
import { ref, update, onValue, push, set, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'
import { useOwner } from '../hooks/useOwner'
import { uploadToCloudinary } from '../lib/cloudinary'

/* ── Componente inline de Recompensas para o dono ─────────────────────────── */
function OwnerRewardsTabInline({ placeId }) {
  const [rewards,  setRewards]  = useState([])
  const [pending,  setPending]  = useState([])
  const [creating, setCreating] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({ title:'', description:'', pointsCost:10000, emoji:'🎁' })

  useEffect(() => {
    if (!placeId) return
    const unsubR = onValue(ref(db, `rewards/${placeId}`), snap => {
      const data = snap.val() || {}
      setRewards(Object.entries(data).map(([id,v]) => ({id,...v})))
    })
    const unsubP = onValue(ref(db, `places/${placeId}/pendingRedemptions`), snap => {
      const data = snap.val() || {}
      setPending(Object.entries(data).map(([id,v]) => ({id,...v})).filter(r => r.status==='pending'))
    })
    return () => { unsubR(); unsubP() }
  }, [placeId])

  const handleCreate = async () => {
    if (!form.title.trim() || form.pointsCost < 100) return
    setSaving(true)
    try {
      await push(ref(db, `rewards/${placeId}`), {
        ...form, pointsCost: Number(form.pointsCost),
        active: true, createdAt: serverTimestamp(),
      })
      setCreating(false)
      setForm({ title:'', description:'', pointsCost:10000, emoji:'🎁' })
    } catch(e) { console.error(e) }
    setSaving(false)
  }

  const toggleActive = async (id, cur) =>
    update(ref(db, `rewards/${placeId}/${id}`), { active: !cur })

  const validate = async (r) => {
    await update(ref(db, `places/${placeId}/pendingRedemptions/${r.id}`), { status:'used' })
  }

  const EMOJIS = ['🎁','🍺','☕','🍕','🍔','🎉','💸','🎫','🥤','🍷','🎭','🏆','💅','🎸','🌟']

  return (
    <div style={{padding:'0 0 32px'}}>
      {/* Pending */}
      {pending.length > 0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:'#ff4757',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#ff4757',animation:'blink 1s ease infinite'}}/>
            {pending.length} resgate{pending.length!==1?'s':''} para validar
          </div>
          {pending.map(r => (
            <div key={r.id} style={{background:'rgba(255,71,87,0.07)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:14,padding:'13px',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'#f0f0ff'}}>{r.rewardTitle}</div>
                  <div style={{fontSize:12,color:'#6666aa'}}>👤 {r.userName} · ⚡ {Number(r.pointsCost||0).toLocaleString('pt-BR')} pts</div>
                </div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:700,color:'#00f5a0',letterSpacing:'.1em'}}>{r.code}</div>
              </div>
              <button onClick={() => validate(r)} style={{
                width:'100%',padding:'9px',borderRadius:10,border:'none',
                background:'rgba(0,245,160,0.15)',color:'#00f5a0',
                fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:12,cursor:'pointer',
              }}>✓ Validar resgate</button>
            </div>
          ))}
        </div>
      )}

      {/* Existing rewards */}
      <div style={{marginBottom:12}}>
        {rewards.map(r => (
          <div key={r.id} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'13px',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
            <div style={{fontSize:22,flexShrink:0}}>{r.emoji||'🎁'}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:'#f0f0ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</div>
              <div style={{fontSize:12,color:'#6666aa'}}>⚡ {Number(r.pointsCost||0).toLocaleString('pt-BR')} pts · {r.active?'Ativo':'Inativo'}</div>
            </div>
            <button onClick={() => toggleActive(r.id, r.active)} style={{
              padding:'5px 10px',borderRadius:8,
              background: r.active ? 'rgba(0,245,160,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${r.active ? 'rgba(0,245,160,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: r.active ? '#00f5a0' : '#6666aa',
              fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",
            }}>{r.active ? '● On' : '○ Off'}</button>
          </div>
        ))}
      </div>

      {!creating ? (
        <button onClick={() => setCreating(true)} style={{
          width:'100%',padding:13,borderRadius:14,
          background:'rgba(0,245,160,0.06)',border:'1px dashed rgba(0,245,160,0.3)',
          color:'#00f5a0',fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:13,cursor:'pointer',
        }}>+ Criar nova recompensa</button>
      ) : (
        <div style={{background:'rgba(0,245,160,0.04)',border:'1px solid rgba(0,245,160,0.2)',borderRadius:18,padding:'18px'}}>
          <div style={{fontSize:13,fontWeight:700,color:'#f0f0ff',marginBottom:14}}>✨ Nova recompensa</div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:'#6666aa',marginBottom:7}}>Ícone</div>
            <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setForm(f=>({...f,emoji:e}))} style={{
                  width:34,height:34,borderRadius:9,border:`2px solid ${form.emoji===e?'#00f5a0':'rgba(255,255,255,0.1)'}`,
                  background:form.emoji===e?'rgba(0,245,160,0.15)':'rgba(255,255,255,0.04)',
                  fontSize:17,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                }}>{e}</button>
              ))}
            </div>
          </div>
          {[
            {key:'title', label:'Nome', placeholder:'Ex: Uma cerveja grátis'},
            {key:'description', label:'Descrição', placeholder:'Ex: Válido p/ qualquer chope de seg a qui'},
          ].map(f => (
            <div key={f.key} style={{marginBottom:12}}>
              <div style={{fontSize:11,color:'#6666aa',marginBottom:6}}>{f.label}</div>
              <input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                placeholder={f.placeholder}
                style={{width:'100%',background:'#1a1a26',border:'1px solid #2a2a3d',borderRadius:12,padding:'10px 13px',color:'#f0f0ff',fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,outline:'none',boxSizing:'border-box'}}
              />
            </div>
          ))}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:'#6666aa',marginBottom:6}}>Custo em pontos</div>
            <input type="number" min="100" step="1000" value={form.pointsCost}
              onChange={e=>setForm(p=>({...p,pointsCost:parseInt(e.target.value)||0}))}
              style={{width:'100%',background:'#1a1a26',border:'1px solid rgba(0,245,160,0.3)',borderRadius:12,padding:'10px 13px',color:'#00f5a0',fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,outline:'none',boxSizing:'border-box'}}
            />
            <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:5}}>
              Sugestão: 5.000–50.000 pts conforme valor do benefício
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={() => setCreating(false)} style={{flex:1,padding:'11px',borderRadius:12,cursor:'pointer',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'#6666aa',fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:13}}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={{flex:2,padding:'11px',borderRadius:12,border:'none',cursor:'pointer',background:saving?'rgba(0,245,160,0.5)':'linear-gradient(135deg,#00f5a0,#00c87a)',color:'#0a0f1e',fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:13}}>
              {saving ? 'Salvando...' : '✓ Criar recompensa'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const OCCUPANCY_STEPS = [0, 25, 50, 75, 90, 100]

function OccupancyColor(p) {
  if (p===null||p===undefined) return '#6666aa'
  if (p>=90) return '#ff2d55'
  if (p>=60) return '#ffcc00'
  return '#00ff88'
}

export default function OwnerPanel({ open, place, uid, onClose }) {
  const { setOccupancy, saveDescription } = useOwner(place?.id, uid)

  const [occupancy,   setOcc]      = useState(place?.occupancy ?? null)
  const [description, setDesc]     = useState(place?.description || '')
  const [schedule,    setSched]    = useState(place?.schedule    || '')
  const [instagram,   setInsta]    = useState(place?.instagram   || '')
  const [phone,       setPhone]    = useState(place?.phone       || '')
  const [tab,         setTab]      = useState('lotacao')
  const [saving,      setSaving]   = useState(false)
  const [saved,       setSaved]    = useState(false)

  // Cover upload state
  const [coverPreview, setCoverPreview] = useState(null)
  const [coverFile,    setCoverFile]    = useState(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [coverSaved,  setCoverSaved]   = useState(false)

  useEffect(() => {
    setOcc(place?.occupancy ?? null)
    setDesc(place?.description || '')
    setSched(place?.schedule   || '')
    setInsta(place?.instagram  || '')
    setPhone(place?.phone      || '')
    setCoverPreview(null)
    setCoverFile(null)
  }, [place?.id])

  const handleSaveOccupancy = async () => {
    setSaving(true)
    await setOccupancy(occupancy)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveInfo = async () => {
    setSaving(true)
    await saveDescription({ description, schedule, instagram, phone })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCoverChange = e => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = ev => setCoverPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSaveCover = async () => {
    if (!coverFile || !place?.id) return
    setUploadingCover(true)
    try {
      const url = await uploadToCloudinary(coverFile)
      await update(ref(db, `places/${place.id}`), { coverUrl: url, updatedAt: Date.now() })
      setCoverSaved(true)
      setCoverFile(null)
      setTimeout(() => setCoverSaved(false), 3000)
    } catch(e) {
      alert(`Erro ao enviar capa:\n${e.message}`)
      console.error(e)
    }
    setUploadingCover(false)
  }

  const oColor = OccupancyColor(occupancy)

  const TABS = [
    { id:'lotacao',     label:'📊 Lotação'    },
    { id:'capa',        label:'🖼️ Capa'       },
    { id:'info',        label:'📝 Info'       },
    { id:'recompensas', label:'⚡ Recompensas' },
  ]

  return (
    <>
      <div onClick={onClose} style={{
        position:'fixed', inset:0, zIndex:2500,
        background:'rgba(0,0,0,.7)', backdropFilter:'blur(4px)',
        opacity:open?1:0, pointerEvents:open?'all':'none', transition:'opacity .25s',
      }}/>

      <div style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:2600,
        background:'#12121a', borderTop:'2px solid #ffcc00',
        borderRadius:'20px 20px 0 0', padding:'0 16px 40px',
        maxHeight:'88vh', overflowY:'auto',
        transform:open?'translateY(0)':'translateY(100%)',
        transition:'transform .35s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{width:40, height:4, background:'#2a2a3d', borderRadius:2, margin:'12px auto 18px'}}/>

        {/* Header */}
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:20}}>
          <div style={{background:'rgba(255,204,0,.15)', border:'1px solid rgba(255,204,0,.4)', borderRadius:10, padding:'6px 10px', fontSize:18}}>👑</div>
          <div>
            <div style={{fontWeight:800, fontSize:16}}>Painel do Dono</div>
            <div style={{fontSize:12, color:'#6666aa', marginTop:1}}>{place?.name}</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft:'auto', width:32, height:32, borderRadius:'50%',
            background:'#1a1a26', border:'1px solid #2a2a3d',
            cursor:'pointer', color:'#6666aa', fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex', gap:6, marginBottom:20}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer',
              background:tab===t.id?'#ffcc00':'#1a1a26',
              color:tab===t.id?'#000':'#6666aa',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:12,
              transition:'all .15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── TAB LOTAÇÃO ── */}
        {tab==='lotacao'&&(
          <div>
            <p style={{fontSize:12, color:'#6666aa', marginBottom:16, lineHeight:1.6}}>
              Atualize a lotação do seu estabelecimento em tempo real.
            </p>
            <div style={{background:'#1a1a26', border:`1px solid ${oColor}44`, borderRadius:16, padding:'20px', textAlign:'center', marginBottom:20}}>
              <div style={{fontFamily:"'Syne',monospace", fontSize:48, fontWeight:700, color:oColor}}>
                {occupancy===null?'—':`${occupancy}%`}
              </div>
              <div style={{fontSize:13, color:'#6666aa', marginTop:4}}>
                {occupancy===null?'Não informado':occupancy>=90?'🚨 Lotado':occupancy>=60?'⚡ Quase cheio':occupancy>0?'✅ Tem espaço':'✅ Aberto e vazio'}
              </div>
              {occupancy!==null&&(
                <div style={{background:'#2a2a3d', borderRadius:10, height:8, marginTop:16, overflow:'hidden'}}>
                  <div style={{height:'100%', borderRadius:10, background:oColor, width:`${occupancy}%`, transition:'width .4s ease, background .3s'}}/>
                </div>
              )}
            </div>
            <p style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'#6666aa', marginBottom:10}}>Selecione a lotação atual</p>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12}}>
              {OCCUPANCY_STEPS.map(p=>(
                <button key={p} onClick={()=>setOcc(p)} style={{
                  padding:'12px 8px', borderRadius:12, cursor:'pointer',
                  background:occupancy===p?`${OccupancyColor(p)}22`:'#1a1a26',
                  border:`1px solid ${occupancy===p?OccupancyColor(p):'#2a2a3d'}`,
                  color:occupancy===p?OccupancyColor(p):'#f0f0ff',
                  fontFamily:"'Syne',monospace", fontWeight:700, fontSize:14, transition:'all .15s',
                }}>{p===0?'Vazio':p===100?'Lotado':`${p}%`}</button>
              ))}
            </div>
            <button onClick={()=>setOcc(null)} style={{
              width:'100%', padding:'10px', borderRadius:10,
              border:'1px solid #2a2a3d', background:'transparent',
              color:'#6666aa', fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:12, cursor:'pointer', marginBottom:20,
            }}>✕ Não informar lotação</button>
            <button onClick={handleSaveOccupancy} disabled={saving} style={{
              width:'100%', padding:15, borderRadius:14, border:'none',
              background:saved?'#00ff88':'#ffcc00', color:'#000',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15, cursor:'pointer', transition:'all .2s',
            }}>{saved?'✅ Salvo!':saving?'⏳ Salvando...':'💾 Atualizar lotação'}</button>
          </div>
        )}

        {/* ── TAB CAPA ── */}
        {tab==='capa'&&(
          <div>
            <p style={{fontSize:12, color:'#6666aa', marginBottom:16, lineHeight:1.6}}>
              Adicione uma foto de capa para o seu estabelecimento. Ela aparece em destaque quando alguém abrir o local.
            </p>

            {/* Preview */}
            <div style={{
              height:180, borderRadius:16, overflow:'hidden', marginBottom:16,
              background:'#1a1a26', border:'1px dashed #2a2a3d',
              display:'flex', alignItems:'center', justifyContent:'center', position:'relative',
            }}>
              {coverPreview||place?.coverUrl
                ? <img src={coverPreview||place.coverUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : (
                  <div style={{textAlign:'center', color:'#6666aa'}}>
                    <div style={{fontSize:36, marginBottom:8}}>🖼️</div>
                    <div style={{fontSize:13}}>Nenhuma capa ainda</div>
                  </div>
                )
              }
              {(coverPreview||place?.coverUrl)&&(
                <div style={{
                  position:'absolute', inset:0,
                  background:'rgba(0,0,0,.35)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  opacity:0, transition:'opacity .2s',
                }}
                  onMouseEnter={e=>e.currentTarget.style.opacity=1}
                  onMouseLeave={e=>e.currentTarget.style.opacity=0}
                >
                  <span style={{color:'#fff', fontSize:12, fontWeight:700}}>Clique abaixo para trocar</span>
                </div>
              )}
            </div>

            {/* Upload btn */}
            <label style={{
              display:'block', width:'100%', padding:14, borderRadius:14,
              background:'#1a1a26', border:'1px dashed #ffcc0066',
              color:'#ffcc00', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:14,
              cursor:'pointer', textAlign:'center', marginBottom:12, boxSizing:'border-box',
            }}>
              📸 {coverPreview?'Trocar foto':'Escolher foto da galeria'}
              <input type="file" accept="image/*" onChange={handleCoverChange} style={{display:'none'}}/>
            </label>

            {coverFile&&(
              <button onClick={handleSaveCover} disabled={uploadingCover} style={{
                width:'100%', padding:15, borderRadius:14, border:'none',
                background:coverSaved?'#00ff88':'#ffcc00', color:'#000',
                fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15, cursor:'pointer', transition:'all .2s',
              }}>
                {coverSaved?'✅ Capa salva!':uploadingCover?'⏳ Enviando...':'💾 Salvar capa'}
              </button>
            )}

            {place?.coverUrl&&!coverFile&&(
              <button onClick={async()=>{
                if (!confirm('Remover capa?')) return
                await update(ref(db,`places/${place.id}`),{coverUrl:null})
              }} style={{
                width:'100%', padding:12, borderRadius:12, marginTop:8,
                border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.07)',
                color:'#f87171', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:13, cursor:'pointer',
              }}>🗑️ Remover capa atual</button>
            )}
          </div>
        )}

        {/* ── TAB INFO ── */}
        {tab==='info'&&(
          <div>
            <p style={{fontSize:12, color:'#6666aa', marginBottom:16, lineHeight:1.6}}>
              Adicione informações do seu estabelecimento visíveis para todos.
            </p>
            {[
              {label:'📝 Descrição / O que vai rolar', value:description, set:setDesc, placeholder:'Ex: Quinta tem rock ao vivo, happy hour das 18h às 20h...', multi:true},
              {label:'🕐 Horários', value:schedule, set:setSched, placeholder:'Ex: Seg–Sex 18h–00h, Sáb–Dom 14h–02h'},
              {label:'📸 Instagram', value:instagram, set:setInsta, placeholder:'@seuestabelecimento'},
              {label:'📞 WhatsApp / Telefone', value:phone, set:setPhone, placeholder:'(14) 99999-9999'},
            ].map(f=>(
              <div key={f.label} style={{marginBottom:16}}>
                <p style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.1em', color:'#6666aa', marginBottom:8}}>{f.label}</p>
                {f.multi?(
                  <textarea value={f.value} onChange={e=>f.set(e.target.value)}
                    placeholder={f.placeholder} maxLength={300} rows={3}
                    style={{width:'100%', background:'#1a1a26', border:'1px solid #2a2a3d', borderRadius:12, padding:'12px 14px', color:'#f0f0ff', fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, outline:'none', resize:'none', lineHeight:1.5}}
                    onFocus={e=>e.target.style.borderColor='#ffcc00'}
                    onBlur={e=>e.target.style.borderColor='#2a2a3d'}/>
                ):(
                  <input value={f.value} onChange={e=>f.set(e.target.value)}
                    placeholder={f.placeholder} maxLength={100}
                    style={{width:'100%', background:'#1a1a26', border:'1px solid #2a2a3d', borderRadius:12, padding:'12px 14px', color:'#f0f0ff', fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, outline:'none'}}
                    onFocus={e=>e.target.style.borderColor='#ffcc00'}
                    onBlur={e=>e.target.style.borderColor='#2a2a3d'}/>
                )}
              </div>
            ))}
            <button onClick={handleSaveInfo} disabled={saving} style={{
              width:'100%', padding:15, borderRadius:14, border:'none',
              background:saved?'#00ff88':'#ffcc00', color:'#000',
              fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15, cursor:'pointer', transition:'all .2s',
            }}>{saved?'✅ Salvo!':saving?'⏳ Salvando...':'💾 Salvar informações'}</button>
          </div>
        )}

        {/* ── RECOMPENSAS ── */}
        {tab==='recompensas' && (
          <OwnerRewardsTabInline placeId={place?.id}/>
        )}
      </div>
    </>
  )
}
