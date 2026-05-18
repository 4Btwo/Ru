import React, { useState, useEffect } from 'react'
import { ref, update, onValue, push, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'
import { useOwner } from '../hooks/useOwner'
import { uploadToCloudinary } from '../lib/cloudinary'

const T = { muted:'rgba(240,240,255,0.38)', text:'#f0f0ff', dim:'rgba(240,240,255,0.16)', border:'rgba(255,255,255,0.07)', surface:'rgba(255,255,255,0.04)' }
const EMOJIS = ['🎁','🍺','☕','🍕','🍔','🎉','💸','🎫','🥤','🍷','🎭','🏆','💅','🎸','🌟']
const OCC_STEPS = [0,25,50,75,90,100]
const occColor = p => p===null||p===undefined?T.muted : p>=90?'#ff4757' : p>=60?'#ffd32a' : '#00f5a0'

const FieldInput = ({label, value, onChange, placeholder, multi}) => {
  const [foc,setFoc] = useState(false)
  const s = {width:'100%',background:'rgba(255,255,255,0.04)',border:`1.5px solid ${foc?'rgba(255,211,42,0.55)':'rgba(255,255,255,0.08)'}`,borderRadius:14,padding:'12px 14px',color:T.text,fontFamily:"'DM Sans',sans-serif",fontSize:13,outline:'none',transition:'border-color .2s',boxSizing:'border-box'}
  return (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:T.muted,marginBottom:8,fontWeight:700}}>{label}</div>
      {multi ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={300} rows={3} style={{...s,resize:'none',lineHeight:1.5}} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}/> : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={100} style={s} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}/>}
    </div>
  )
}

function OwnerRewardsTab({placeId}) {
  const [rewards,  setRewards]  = useState([])
  const [pending,  setPending]  = useState([])
  const [creating, setCreating] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({title:'',description:'',pointsCost:10000,emoji:'🎁'})

  useEffect(()=>{
    if (!placeId) return
    const u1=onValue(ref(db,`rewards/${placeId}`),snap=>setRewards(Object.entries(snap.val()||{}).map(([id,v])=>({id,...v}))))
    const u2=onValue(ref(db,`places/${placeId}/pendingRedemptions`),snap=>setPending(Object.entries(snap.val()||{}).map(([id,v])=>({id,...v})).filter(r=>r.status==='pending')))
    return()=>{u1();u2()}
  },[placeId])

  const handleCreate = async()=>{
    if(!form.title.trim()||form.pointsCost<100) return
    setSaving(true)
    try{await push(ref(db,`rewards/${placeId}`),{...form,pointsCost:Number(form.pointsCost),active:true,createdAt:serverTimestamp()});setCreating(false);setForm({title:'',description:'',pointsCost:10000,emoji:'🎁'})}catch(e){console.error(e)}
    setSaving(false)
  }
  const toggleActive = (id,cur)=>update(ref(db,`rewards/${placeId}/${id}`),{active:!cur})
  const validate = r=>update(ref(db,`places/${placeId}/pendingRedemptions/${r.id}`),{status:'used'})

  return (
    <div style={{paddingBottom:32}}>
      {pending.length>0&&(
        <div style={{marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:700,color:'#ff4757',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:'#ff4757',animation:'blink 1s ease infinite'}}/>{pending.length} para validar
          </div>
          {pending.map(r=>(
            <div key={r.id} style={{background:'rgba(255,71,87,0.07)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:18,padding:14,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.rewardTitle}</div><div style={{fontSize:12,color:T.muted}}>👤 {r.userName} · ⚡ {Number(r.pointsCost||0).toLocaleString('pt-BR')} pts</div></div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:22,fontWeight:700,color:'#00f5a0',letterSpacing:'.1em'}}>{r.code}</div>
              </div>
              <button onClick={()=>validate(r)} style={{width:'100%',padding:'10px',borderRadius:12,border:'none',background:'rgba(0,245,160,0.12)',color:'#00f5a0',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:12,cursor:'pointer',border:'1px solid rgba(0,245,160,0.28)'}}>✓ Validar resgate</button>
            </div>
          ))}
        </div>
      )}

      <div style={{marginBottom:14}}>
        {rewards.map(r=>(
          <div key={r.id} style={{display:'flex',alignItems:'center',gap:11,background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:13,marginBottom:8}}>
            <div style={{fontSize:22,flexShrink:0}}>{r.emoji||'🎁'}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</div>
              <div style={{fontSize:11,color:T.muted}}>⚡ {Number(r.pointsCost||0).toLocaleString('pt-BR')} pts · <span style={{color:r.active?'#00f5a0':T.dim}}>{r.active?'Ativo':'Inativo'}</span></div>
            </div>
            <button onClick={()=>toggleActive(r.id,r.active)} style={{padding:'5px 12px',borderRadius:999,background:r.active?'rgba(0,245,160,0.1)':T.surface,border:`1px solid ${r.active?'rgba(0,245,160,0.3)':T.border}`,color:r.active?'#00f5a0':T.muted,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:"'DM Sans',sans-serif"}}>{r.active?'● On':'○ Off'}</button>
          </div>
        ))}
      </div>

      {!creating ? (
        <button onClick={()=>setCreating(true)} style={{width:'100%',padding:14,borderRadius:16,background:'rgba(0,245,160,0.04)',border:'1px dashed rgba(0,245,160,0.3)',color:'#00f5a0',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13,cursor:'pointer'}}>+ Criar nova recompensa</button>
      ):(
        <div style={{background:'rgba(0,245,160,0.04)',border:'1px solid rgba(0,245,160,0.2)',borderRadius:20,padding:18}}>
          <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:16,fontFamily:"'Outfit',sans-serif"}}>✨ Nova recompensa</div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Ícone</div>
            <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
              {EMOJIS.map(e=>(
                <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))} style={{width:36,height:36,borderRadius:10,border:`1.5px solid ${form.emoji===e?'rgba(0,245,160,0.6)':T.border}`,background:form.emoji===e?'rgba(0,245,160,0.12)':T.surface,fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>{e}</button>
              ))}
            </div>
          </div>
          <FieldInput label="Nome" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} placeholder="Ex: Uma cerveja grátis"/>
          <FieldInput label="Descrição" value={form.description} onChange={v=>setForm(f=>({...f,description:v}))} placeholder="Ex: Válido p/ qualquer chope de seg a qui"/>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Custo em pontos</div>
            <input type="number" min="100" step="1000" value={form.pointsCost} onChange={e=>setForm(f=>({...f,pointsCost:parseInt(e.target.value)||0}))}
              style={{width:'100%',background:'rgba(0,245,160,0.05)',border:'1.5px solid rgba(0,245,160,0.3)',borderRadius:14,padding:'12px 14px',color:'#00f5a0',fontFamily:"'Space Mono',monospace",fontSize:18,fontWeight:700,outline:'none',boxSizing:'border-box'}}/>
            <div style={{fontSize:11,color:T.dim,marginTop:5}}>Sugestão: 5.000–50.000 pts conforme valor do benefício</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>setCreating(false)} style={{flex:1,padding:'12px',borderRadius:14,cursor:'pointer',background:T.surface,border:`1px solid ${T.border}`,color:T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:13}}>Cancelar</button>
            <button onClick={handleCreate} disabled={saving} style={{flex:2,padding:'12px',borderRadius:14,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#00f5a0,#00c87a)',color:'#001a0d',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:13,opacity:saving?.7:1}}>{saving?'⏳ Salvando...':'✓ Criar recompensa'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OwnerPanel({open, place, uid, onClose}) {
  const {setOccupancy, saveDescription} = useOwner(place?.id, uid)
  const [occ,      setOcc]  = useState(place?.occupancy??null)
  const [desc,     setDesc] = useState(place?.description||'')
  const [sched,    setSched]= useState(place?.schedule||'')
  const [insta,    setInsta]= useState(place?.instagram||'')
  const [phone,    setPhone]= useState(place?.phone||'')
  const [tab,      setTab]  = useState('lotacao')
  const [saving,   setSaving]=useState(false)
  const [saved,    setSaved] =useState(false)
  const [coverPrev,setCoverPrev]=useState(null)
  const [coverFile,setCoverFile]=useState(null)
  const [uploading,setUploading]=useState(false)
  const [coverSaved,setCoverSaved]=useState(false)

  useEffect(()=>{setOcc(place?.occupancy??null);setDesc(place?.description||'');setSched(place?.schedule||'');setInsta(place?.instagram||'');setPhone(place?.phone||'');setCoverPrev(null);setCoverFile(null)},[place?.id])

  const saveOcc = async()=>{ setSaving(true);await setOccupancy(occ);setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2500) }
  const saveInfo= async()=>{ setSaving(true);await saveDescription({description:desc,schedule:sched,instagram:insta,phone});setSaving(false);setSaved(true);setTimeout(()=>setSaved(false),2500) }
  const handleCoverChange = e=>{const file=e.target.files?.[0];if(!file)return;setCoverFile(file);const r=new FileReader();r.onload=ev=>setCoverPrev(ev.target.result);r.readAsDataURL(file)}
  const saveCover = async()=>{
    if(!coverFile||!place?.id) return
    setUploading(true)
    try{const url=await uploadToCloudinary(coverFile);await update(ref(db,`places/${place.id}`),{coverUrl:url,updatedAt:Date.now()});setCoverSaved(true);setCoverFile(null);setTimeout(()=>setCoverSaved(false),3000)}catch(e){alert(`Erro: ${e.message}`)}
    setUploading(false)
  }
  const c = occColor(occ)
  const TABS = [{id:'lotacao',l:'📊 Lotação'},{id:'capa',l:'🖼️ Capa'},{id:'info',l:'📝 Info'},{id:'recompensas',l:'⚡ Recompensas'}]

  const SaveBtn = ({onClick}) => (
    <button onClick={onClick} disabled={saving} style={{width:'100%',padding:15,borderRadius:16,border:'none',background:saved?'rgba(0,245,160,0.15)':saving?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#ffd32a,#ffb700)',color:saved?'#00f5a0':saving?T.muted:'#000',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:15,cursor:saving?'wait':'pointer',transition:'all .2s',boxShadow:(!saving&&!saved)?'0 4px 20px rgba(255,211,42,0.35)':'none'}}>
      {saved?'✅ Salvo!':saving?'⏳ Salvando...':'💾 Salvar'}
    </button>
  )

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:2500,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',opacity:open?1:0,pointerEvents:open?'all':'none',transition:'opacity .25s'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2600,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,211,42,0.22)',borderBottom:'none',borderRadius:'28px 28px 0 0',padding:'0 16px',paddingBottom:'calc(20px + env(safe-area-inset-bottom,0px))',maxHeight:'90vh',overflowY:'auto',transform:open?'translateY(0)':'translateY(100%)',transition:'transform .38s cubic-bezier(.32,.72,0,1)'}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'14px auto 20px'}}/>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
          <div style={{width:44,height:44,borderRadius:14,background:'rgba(255,211,42,0.12)',border:'1px solid rgba(255,211,42,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>👑</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Outfit',sans-serif",fontSize:17,fontWeight:800,letterSpacing:'-.02em',color:T.text}}>Painel do Dono</div>
            <div style={{fontSize:12,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{place?.name}</div>
          </div>
          <button onClick={onClose} style={{width:34,height:34,borderRadius:'50%',background:T.surface,border:`1px solid ${T.border}`,cursor:'pointer',color:T.muted,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:6,marginBottom:22}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'10px 2px',borderRadius:12,border:`1px solid ${tab===t.id?'rgba(255,211,42,0.45)':T.border}`,cursor:'pointer',background:tab===t.id?'rgba(255,211,42,0.1)':T.surface,color:tab===t.id?'#ffd32a':T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:10,transition:'all .15s',whiteSpace:'nowrap'}}>{t.l}</button>
          ))}
        </div>

        {/* LOTAÇÃO */}
        {tab==='lotacao'&&(
          <div>
            <p style={{fontSize:12,color:T.muted,marginBottom:18,lineHeight:1.7}}>Atualize em tempo real para seus clientes saberem quando chegar.</p>
            <div style={{background:T.surface,border:`1px solid ${c}44`,borderRadius:20,padding:'20px',textAlign:'center',marginBottom:20}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:52,fontWeight:700,color:c,lineHeight:1}}>{occ===null?'—':`${occ}%`}</div>
              <div style={{fontSize:13,color:T.muted,marginTop:6}}>{occ===null?'Não informado':occ>=90?'🚨 Lotado':occ>=60?'⚡ Quase cheio':occ>0?'✅ Tem espaço':'✅ Aberto e vazio'}</div>
              {occ!==null&&<div style={{background:'rgba(255,255,255,0.07)',borderRadius:999,height:6,marginTop:14,overflow:'hidden'}}><div style={{height:'100%',borderRadius:999,background:c,width:`${occ}%`,transition:'width .4s'}}/></div>}
            </div>
            <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:T.muted,marginBottom:10,fontWeight:700}}>Selecione a lotação atual</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
              {OCC_STEPS.map(p=>(
                <button key={p} onClick={()=>setOcc(p)} style={{padding:'12px 6px',borderRadius:14,cursor:'pointer',background:occ===p?`${occColor(p)}18`:T.surface,border:`1.5px solid ${occ===p?occColor(p):T.border}`,color:occ===p?occColor(p):T.text,fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:14,transition:'all .15s'}}>{p===0?'Vazio':p===100?'Lotado':`${p}%`}</button>
              ))}
            </div>
            <button onClick={()=>setOcc(null)} style={{width:'100%',padding:'10px',borderRadius:12,border:`1px solid ${T.border}`,background:'transparent',color:T.muted,fontFamily:"'DM Sans',sans-serif",fontSize:12,cursor:'pointer',marginBottom:18}}>✕ Não informar lotação</button>
            <SaveBtn onClick={saveOcc}/>
          </div>
        )}

        {/* CAPA */}
        {tab==='capa'&&(
          <div>
            <p style={{fontSize:12,color:T.muted,marginBottom:16,lineHeight:1.7}}>Imagem de capa que aparece em destaque quando abrirem seu local.</p>
            <div style={{height:188,borderRadius:20,overflow:'hidden',marginBottom:16,background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(255,255,255,0.09)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
              {(coverPrev||place?.coverUrl)?<img src={coverPrev||place.coverUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{textAlign:'center',color:T.muted}}><div style={{fontSize:40,marginBottom:8}}>🖼️</div><div style={{fontSize:13}}>Nenhuma capa ainda</div></div>}
            </div>
            <label style={{display:'block',width:'100%',padding:14,borderRadius:16,background:'rgba(255,211,42,0.06)',border:'1px dashed rgba(255,211,42,0.35)',color:'#ffd32a',fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,cursor:'pointer',textAlign:'center',marginBottom:12,boxSizing:'border-box'}}>
              📸 {coverPrev?'Trocar foto':'Escolher da galeria'}
              <input type="file" accept="image/*" onChange={handleCoverChange} style={{display:'none'}}/>
            </label>
            {coverFile&&<button onClick={saveCover} disabled={uploading} style={{width:'100%',padding:15,borderRadius:16,border:'none',background:coverSaved?'rgba(0,245,160,0.15)':'linear-gradient(135deg,#ffd32a,#ffb700)',color:coverSaved?'#00f5a0':'#000',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:10,transition:'all .2s'}}>{coverSaved?'✅ Capa salva!':uploading?'⏳ Enviando...':'💾 Salvar capa'}</button>}
            {place?.coverUrl&&!coverFile&&<button onClick={async()=>{if(!confirm('Remover capa?'))return;await update(ref(db,`places/${place.id}`),{coverUrl:null})}} style={{width:'100%',padding:12,borderRadius:14,border:'1px solid rgba(255,71,87,0.28)',background:'rgba(255,71,87,0.07)',color:'#ff4757',fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,cursor:'pointer'}}>🗑️ Remover capa atual</button>}
          </div>
        )}

        {/* INFO */}
        {tab==='info'&&(
          <div>
            <p style={{fontSize:12,color:T.muted,marginBottom:16,lineHeight:1.7}}>Informações visíveis para todos no seu perfil.</p>
            <FieldInput label="📝 Descrição / O que vai rolar" value={desc} onChange={setDesc} placeholder="Ex: Quinta tem rock ao vivo, happy hour 18h–20h..." multi/>
            <FieldInput label="🕐 Horários" value={sched} onChange={setSched} placeholder="Ex: Seg–Sex 18h–00h, Sáb–Dom 14h–02h"/>
            <FieldInput label="📸 Instagram" value={insta} onChange={setInsta} placeholder="@seuestabelecimento"/>
            <FieldInput label="📞 WhatsApp / Telefone" value={phone} onChange={setPhone} placeholder="(14) 99999-9999"/>
            <SaveBtn onClick={saveInfo}/>
          </div>
        )}

        {/* RECOMPENSAS */}
        {tab==='recompensas'&&<OwnerRewardsTab placeId={place?.id}/>}
      </div>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </>
  )
}
