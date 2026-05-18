import React, { useState, useEffect } from 'react'
import { ref, onValue, push, set, update, get, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

function genCode(){ return Math.random().toString(36).substring(2,8).toUpperCase() }
function useRewards(placeId){ const [r,setR]=useState([]); useEffect(()=>{ if(!placeId) return; return onValue(ref(db,`rewards/${placeId}`),snap=>{ const d=snap.val()||{}; setR(Object.entries(d).map(([id,v])=>({id,...v})).filter(x=>x.active!==false)) }) },[placeId]); return r }
function useMyRedemptions(uid){ const [r,setR]=useState([]); useEffect(()=>{ if(!uid) return; return onValue(ref(db,`redemptions/${uid}`),snap=>{ const d=snap.val()||{}; setR(Object.entries(d).map(([id,v])=>({id,...v}))) }) },[uid]); return r }
function useAllRewards(allPlaces){ const [r,setR]=useState([]); useEffect(()=>{ if(!allPlaces?.length) return; const pp=allPlaces.filter(p=>p.ownerId); if(!pp.length) return; Promise.all(pp.map(p=>get(ref(db,`rewards/${p.id}`)))).then(snaps=>{ const result=[]; snaps.forEach((snap,i)=>{ const pl=pp[i]; Object.entries(snap.val()||{}).forEach(([id,v])=>{ if(v.active!==false) result.push({id,placeId:pl.id,placeName:pl.name,placeEmoji:pl.iconEmoji||'📍',...v}) }) }); result.sort((a,b)=>(a.pointsCost||0)-(b.pointsCost||0)); setR(result) }) },[allPlaces]); return r }

const TIERS=[{min:0,max:4999,label:'Explorer',color:'#94a3b8',emoji:'🗺️'},{min:5000,max:14999,label:'Urbano',color:'#00f5a0',emoji:'⚡'},{min:15000,max:29999,label:'Local',color:'#4f8eff',emoji:'💙'},{min:30000,max:59999,label:'Influencer',color:'#7c5cfc',emoji:'👑'},{min:60000,max:Infinity,label:'Lendário',color:'#ffd32a',emoji:'🌟'}]
const T = {muted:'rgba(240,240,255,0.38)',text:'#f0f0ff',dim:'rgba(240,240,255,0.16)',border:'rgba(255,255,255,0.07)',surface:'rgba(255,255,255,0.04)'}
const HOW_TO = [{pts:'+15',desc:'Adicionar local novo',icon:'📍'},{pts:'+10',desc:'Reportar ocorrência',icon:'📡'},{pts:'+8',desc:'Confirmar reporte',icon:'✅'},{pts:'+5',desc:'Resolver situação',icon:'🔧'},{pts:'+3',desc:'Avaliar estabelecimento',icon:'⭐'},{pts:'2x',desc:'Streak de 7 dias',icon:'🔥'},{pts:'+50',desc:'Viral (100 views)',icon:'🚀'}]

export default function RewardsPanel({open,onClose,user,allPlaces,onUpdateScore}) {
  const [tab,       setTab]       = useState('explorar')
  const [redeeming, setRedeeming] = useState(null)
  const [redeemCode,setRedeemCode]= useState(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const allRewards    = useAllRewards(allPlaces)
  const myRedemptions = useMyRedemptions(user?.uid)
  const userScore     = user?.score ?? 0
  const tier          = TIERS.find(t=>userScore>=t.min&&userScore<=t.max)||TIERS[0]
  const nextTier      = TIERS[TIERS.indexOf(tier)+1]
  const progress      = nextTier?Math.min(100,((userScore-tier.min)/(nextTier.min-tier.min))*100):100

  const handleRedeem = async reward=>{
    if(!user?.uid) return
    if(userScore<reward.pointsCost){setError('Pontos insuficientes! Continue explorando.');return}
    setLoading(true);setError(null)
    try {
      const code=genCode(),rid=`${reward.placeId}_${reward.id}_${Date.now()}`,now=Date.now()
      await set(ref(db,`redemptions/${user.uid}/${rid}`),{code,placeId:reward.placeId,placeName:reward.placeName,rewardId:reward.id,rewardTitle:reward.title,rewardEmoji:reward.emoji||'🎁',pointsCost:reward.pointsCost,status:'pending',ts:serverTimestamp(),expiresAt:now+24*3600000})
      await push(ref(db,`places/${reward.placeId}/pendingRedemptions`),{uid:user.uid,userName:user.name||'Urbano',code,rewardId:reward.id,rewardTitle:reward.title,pointsCost:reward.pointsCost,ts:serverTimestamp(),status:'pending'})
      const snap=await get(ref(db,`users/${user.uid}/score`))
      const newScore=Math.max(0,(snap.val()||0)-reward.pointsCost)
      await set(ref(db,`users/${user.uid}/score`),newScore)
      if(onUpdateScore) onUpdateScore(newScore)
      setRedeemCode({code,reward})
    }catch(e){console.error(e);setError('Erro ao resgatar. Tente novamente.')}
    setLoading(false)
  }

  const closeRedeem=()=>{setRedeeming(null);setRedeemCode(null);setError(null)}
  if(!open) return null

  return (
    <>
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:2400,background:'rgba(0,0,0,.78)',backdropFilter:'blur(9px)',WebkitBackdropFilter:'blur(9px)'}}/>
      <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:2500,background:'rgba(8,8,20,0.97)',backdropFilter:'blur(40px)',WebkitBackdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'28px 28px 0 0',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.15)',borderRadius:2,margin:'14px auto 0',flexShrink:0}}/>

        {/* Header */}
        <div style={{padding:'18px 16px 0',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,letterSpacing:'-.03em',marginBottom:3,background:'linear-gradient(135deg,#00f5a0,#4f8eff)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>⚡ Recompensas</div>
              <div style={{fontSize:12,color:T.muted}}>Troque pontos por benefícios exclusivos</div>
            </div>
            <button onClick={onClose} style={{width:36,height:36,borderRadius:'50%',background:T.surface,border:'1px solid rgba(255,255,255,0.08)',cursor:'pointer',color:T.muted,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>

          {/* Score card */}
          <div style={{background:'rgba(0,245,160,0.06)',border:'1px solid rgba(0,245,160,0.2)',borderRadius:18,padding:'16px',marginBottom:14}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:11}}>
                <div style={{width:44,height:44,borderRadius:14,background:'rgba(0,245,160,0.1)',border:'1px solid rgba(0,245,160,0.28)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{tier.emoji}</div>
                <div>
                  <div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Nível {tier.label}</div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:24,fontWeight:700,color:'#00f5a0',lineHeight:1}}>{userScore.toLocaleString('pt-BR')}</div>
                  <div style={{fontSize:11,color:T.muted}}>pontos disponíveis</div>
                </div>
              </div>
              {nextTier&&<div style={{textAlign:'right'}}><div style={{fontSize:10,color:T.muted}}>Próximo nível</div><div style={{fontSize:13,fontWeight:700,color:nextTier.color}}>{nextTier.emoji} {nextTier.label}</div><div style={{fontSize:10,color:T.dim}}>{(nextTier.min-userScore).toLocaleString('pt-BR')} pts</div></div>}
            </div>
            <div style={{background:'rgba(255,255,255,0.07)',borderRadius:999,height:6,overflow:'hidden'}}><div style={{width:`${progress}%`,height:'100%',borderRadius:999,background:'linear-gradient(90deg,#00f5a0,#4f8eff)',transition:'width .5s'}}/></div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:6,paddingBottom:14}}>
            {[{id:'explorar',l:'🎁 Explorar'},{id:'meus',l:'🎫 Meus Resgates'},{id:'como',l:'❓ Como ganhar'}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'9px 4px',borderRadius:12,background:tab===t.id?'rgba(0,245,160,0.1)':T.surface,border:`1px solid ${tab===t.id?'rgba(0,245,160,0.38)':T.border}`,color:tab===t.id?'#00f5a0':T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:11,cursor:'pointer',transition:'all .2s',whiteSpace:'nowrap'}}>{t.l}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'16px',paddingBottom:'calc(28px + env(safe-area-inset-bottom,0px))'}}>
          {tab==='explorar'&&(
            allRewards.length===0
              ?<div style={{textAlign:'center',padding:'56px 0',color:T.muted}}><div style={{fontSize:44,marginBottom:14}}>🎁</div><div style={{fontSize:16,fontWeight:700,marginBottom:6,color:'rgba(240,240,255,0.5)'}}>Sem recompensas ainda</div><div style={{fontSize:12}}>Estabelecimentos ainda não cadastraram</div></div>
              :allRewards.map(reward=>{
                const can=userScore>=reward.pointsCost
                return (
                  <div key={reward.id} style={{background:can?'rgba(0,245,160,0.04)':T.surface,border:`1px solid ${can?'rgba(0,245,160,0.2)':T.border}`,borderRadius:20,padding:'16px',marginBottom:10}}>
                    <div style={{display:'flex',gap:13,alignItems:'flex-start'}}>
                      <div style={{width:52,height:52,borderRadius:16,flexShrink:0,background:can?'rgba(0,245,160,0.1)':'rgba(255,255,255,0.05)',border:`1px solid ${can?'rgba(0,245,160,0.25)':'rgba(255,255,255,0.07)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>{reward.emoji||'🎁'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,fontWeight:700,marginBottom:3,color:T.text}}>{reward.title}</div>
                        <div style={{fontSize:12,color:T.muted,marginBottom:8,lineHeight:1.4}}>{reward.description}</div>
                        <div style={{fontSize:11,color:T.muted,marginBottom:10}}>{reward.placeEmoji} {reward.placeName}</div>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div>
                            <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:can?'#00f5a0':T.muted}}>⚡ {reward.pointsCost.toLocaleString('pt-BR')} pts</div>
                            {!can&&<div style={{fontSize:10,color:T.dim,marginTop:1}}>Faltam {(reward.pointsCost-userScore).toLocaleString('pt-BR')} pts</div>}
                          </div>
                          <button onClick={()=>{if(can){setRedeeming(reward);setError(null)}}} disabled={!can} style={{padding:'9px 18px',borderRadius:12,border:'none',background:can?'linear-gradient(135deg,#00f5a0,#00c87a)':'rgba(255,255,255,0.06)',color:can?'#001a0d':'rgba(240,240,255,0.22)',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:13,cursor:can?'pointer':'not-allowed',boxShadow:can?'0 4px 16px rgba(0,245,160,0.3)':'none',transition:'all .15s'}}
                            onMouseDown={e=>{if(can)e.currentTarget.style.transform='scale(.95)'}}
                            onMouseUp={e=>e.currentTarget.style.transform='scale(1)'}
                          >{can?'Resgatar':'Insuficiente'}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
          )}

          {tab==='meus'&&(
            myRedemptions.length===0
              ?<div style={{textAlign:'center',padding:'56px 0',color:T.muted}}><div style={{fontSize:44,marginBottom:14}}>🎫</div><div style={{fontSize:16,fontWeight:700,marginBottom:6,color:'rgba(240,240,255,0.5)'}}>Nenhum resgate ainda</div><div style={{fontSize:12}}>Explore as recompensas disponíveis!</div></div>
              :myRedemptions.sort((a,b)=>(b.ts||0)-(a.ts||0)).map(r=>(
                <div key={r.id} style={{background:r.status==='used'?'rgba(255,255,255,0.02)':'rgba(0,245,160,0.04)',border:`1px solid ${r.status==='used'?T.border:'rgba(0,245,160,0.2)'}`,borderRadius:18,padding:'14px',marginBottom:10,display:'flex',alignItems:'center',gap:13}}>
                  <div style={{width:48,height:48,borderRadius:14,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{r.rewardEmoji||'🎁'}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:2}}>{r.rewardTitle}</div>
                    <div style={{fontSize:11,color:T.muted,marginBottom:4}}>{r.placeName}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:r.status==='used'?T.dim:'#00f5a0',letterSpacing:'.1em'}}>{r.code}</div>
                  </div>
                  <div style={{background:r.status==='used'?'rgba(255,255,255,0.06)':'rgba(0,245,160,0.1)',border:`1px solid ${r.status==='used'?T.border:'rgba(0,245,160,0.28)'}`,borderRadius:999,padding:'4px 10px',fontSize:10,fontWeight:800,color:r.status==='used'?T.muted:'#00f5a0',textTransform:'uppercase',letterSpacing:'.05em'}}>{r.status==='used'?'Usado':'Ativo'}</div>
                </div>
              ))
          )}

          {tab==='como'&&(
            <div>
              <div style={{fontSize:12,color:T.muted,marginBottom:16,lineHeight:1.7}}>Ganhe pontos contribuindo com a comunidade urbana. Quanto mais você explora e reporta, mais pontos acumula!</div>
              {HOW_TO.map((h,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:13,padding:'13px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{width:42,height:42,borderRadius:13,background:'rgba(79,142,255,0.08)',border:'1px solid rgba(79,142,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>{h.icon}</div>
                  <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text}}>{h.desc}</div></div>
                  <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:800,color:'#4f8eff'}}>{h.pts}</div>
                </div>
              ))}
              <div style={{background:'rgba(124,92,252,0.07)',border:'1px solid rgba(124,92,252,0.2)',borderRadius:16,padding:'14px',marginTop:20}}>
                <div style={{fontSize:12,fontWeight:700,color:'#7c5cfc',marginBottom:6}}>🔥 Dica de Pro</div>
                <div style={{fontSize:12,color:T.muted,lineHeight:1.7}}>Mantenha uma streak diária para multiplicar seus pontos. 7 dias consecutivos = 2x pontos!</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {redeeming&&!redeemCode&&(
        <>
          <div onClick={closeRedeem} style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.8)',backdropFilter:'blur(12px)'}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:3001,background:'rgba(8,8,20,0.98)',backdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'28px 28px 0 0',padding:'28px 20px',paddingBottom:'calc(28px + env(safe-area-inset-bottom,0px))'}}>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{fontSize:48,marginBottom:12}}>{redeeming.emoji||'🎁'}</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:800,letterSpacing:'-.03em',marginBottom:6,color:T.text}}>{redeeming.title}</div>
              <div style={{fontSize:13,color:T.muted,marginBottom:14,lineHeight:1.6}}>{redeeming.description}</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(0,245,160,0.08)',border:'1px solid rgba(0,245,160,0.28)',borderRadius:999,padding:'8px 16px',marginBottom:16}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color:'#00f5a0'}}>⚡ {redeeming.pointsCost.toLocaleString('pt-BR')} pontos</span>
              </div>
              {error&&<div style={{background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:12,padding:'10px 14px',fontSize:12,color:'#ff4757',marginBottom:14}}>{error}</div>}
              <div style={{fontSize:12,color:T.muted,lineHeight:1.7}}>Após confirmar, um código único será gerado. Apresente ao estabelecimento para resgatar.</div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={closeRedeem} style={{flex:1,padding:'14px',borderRadius:14,background:T.surface,border:`1px solid ${T.border}`,color:T.muted,fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:14,cursor:'pointer'}}>Cancelar</button>
              <button onClick={()=>handleRedeem(redeeming)} disabled={loading} style={{flex:2,padding:'14px',borderRadius:14,border:'none',background:'linear-gradient(135deg,#00f5a0,#00c87a)',color:'#001a0d',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:14,cursor:'pointer',opacity:loading?.7:1,boxShadow:'0 4px 20px rgba(0,245,160,0.35)'}}>{loading?'⏳ Gerando código...':'✅ Confirmar resgate'}</button>
            </div>
          </div>
        </>
      )}

      {/* Success code */}
      {redeemCode&&(
        <>
          <div onClick={closeRedeem} style={{position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,.8)',backdropFilter:'blur(12px)'}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:3001,background:'rgba(8,8,20,0.98)',backdropFilter:'blur(40px)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'28px 28px 0 0',padding:'32px 20px',paddingBottom:'calc(32px + env(safe-area-inset-bottom,0px))'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:56,marginBottom:12,animation:'bounceIn .4s ease'}}>🎉</div>
              <div style={{fontFamily:"'Outfit',sans-serif",fontSize:22,fontWeight:800,letterSpacing:'-.03em',marginBottom:6,color:T.text}}>Resgatado com sucesso!</div>
              <div style={{fontSize:13,color:T.muted,marginBottom:24}}>Apresente o código ao estabelecimento:</div>
              <div style={{background:'rgba(0,245,160,0.08)',border:'1px solid rgba(0,245,160,0.3)',borderRadius:20,padding:'20px',marginBottom:20,display:'inline-block',width:'100%'}}>
                <div style={{fontSize:11,color:'#00f5a0',fontWeight:700,marginBottom:8,textTransform:'uppercase',letterSpacing:'.1em'}}>Código de resgate</div>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:36,fontWeight:700,color:'#00f5a0',letterSpacing:'.15em'}}>{redeemCode.code}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:8}}>Válido por 24 horas · {redeemCode.reward.placeName}</div>
              </div>
              <button onClick={closeRedeem} style={{width:'100%',padding:'14px',borderRadius:14,border:'none',background:'linear-gradient(135deg,#4f8eff,#7c5cfc)',color:'#fff',fontFamily:"'DM Sans',sans-serif",fontWeight:800,fontSize:14,cursor:'pointer',boxShadow:'0 4px 20px rgba(79,142,255,0.35)'}}>Fechar</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
