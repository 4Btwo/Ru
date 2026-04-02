// ── MOTOR DE HOTSPOT — com expiração variável por tipo ────────────────────────
import { EVENT_META, reputationMultiplier, getDecayThresholds } from './constants'

// Decay por tempo — usa limiares específicos do tipo de evento
export function calcDecay(ts, type = null) {
  const age = Date.now() - ts
  const { strong, medium, expiry } = type
    ? getDecayThresholds(type)
    : { strong: 10*60*1000, medium: 30*60*1000, expiry: 60*60*1000 }

  if (age >= expiry) return 0
  if (age <= strong) return 1.0
  if (age <= medium) {
    const t = (age - strong) / (medium - strong)
    return 1.0 - t * 0.7
  }
  const t = (age - medium) / (expiry - medium)
  return 0.3 - t * 0.3
}

// Score bruto
export function calcScore(locationId, events, usersMap = {}) {
  return events
    .filter(e => e.locationId === locationId)
    .reduce((acc, ev) => {
      const decay  = calcDecay(ev.ts, ev.type)
      if (decay <= 0) return acc
      const weight = EVENT_META[ev.type]?.weight || 1
      const rep    = reputationMultiplier(usersMap[ev.userId]?.reports || 0)
      return acc + weight * decay * rep
    }, 0)
}

export function getHeatLevel(score) {
  if (score >= 6) return 'hot'
  if (score >= 2) return 'mid'
  if (score > 0)  return 'low'
  return 'inactive'
}

export function getDominantType(locationId, events, usersMap = {}) {
  const active = events.filter(e =>
    e.locationId === locationId && calcDecay(e.ts, e.type) > 0
  )
  if (active.length === 0) return null

  const scores = {}
  active.forEach(ev => {
    const decay  = calcDecay(ev.ts, ev.type)
    const weight = EVENT_META[ev.type]?.weight || 1
    const rep    = reputationMultiplier(usersMap[ev.userId]?.reports || 0)
    scores[ev.type] = (scores[ev.type] || 0) + weight * decay * rep
  })

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

export function getLocationStatus(locationId, events, usersMap = {}) {
  const score   = calcScore(locationId, events, usersMap)
  const heat    = getHeatLevel(score)
  const domType = getDominantType(locationId, events, usersMap)

  if (!domType || heat === 'inactive') {
    return { heat: 'inactive', domType: null, label: 'SEM ATIVIDADE', color: '#3a3a5a', emoji: '⚪', score }
  }

  const meta = EVENT_META[domType]

  if (domType === 'morto')   return { heat: 'low', domType, label: 'POUCO MOVIMENTO 😴', color: '#6666aa', emoji: '😴', score }
  if (domType === 'pesado')  return { heat, domType, label: heat === 'hot' ? 'TRÂNSITO INTENSO 🚗' : 'TRÂNSITO PESADO 🚗', color: '#ff6b35', emoji: '🚗', score }
  if (domType === 'bloqueio') return { heat, domType, label: 'VIA BLOQUEADA 🚧', color: '#ffcc00', emoji: '🚧', score }
  if (domType === 'acidente') return { heat, domType, label: 'ACIDENTE NA VIA 💥', color: '#ff2d55', emoji: '💥', score }
  if (domType === 'blitz')    return { heat, domType, label: 'BLITZ POLICIAL 🚔', color: '#3b82f6', emoji: '🚔', score }

  if (domType === 'cheio') return {
    heat, domType, score,
    label: heat === 'hot' ? 'LOTADO AGORA 🔥' : 'ENCHENDO 🍻',
    color: heat === 'hot' ? '#ff2d55' : '#bf5fff',
    emoji: '🍻',
  }
  if (domType === 'evento') return {
    heat, domType, score,
    label: heat === 'hot' ? 'EVENTO BOMBANDO 🎉' : 'EVENTO ROLANDO 🎉',
    color: '#bf5fff',
    emoji: '🎉',
  }

  return { heat, domType, label: meta?.label?.toUpperCase() || 'ATIVO', color: meta?.color || '#ffcc00', emoji: meta?.emoji || '⚡', score }
}

export function getActiveEvents(locationId, events) {
  return events
    .filter(e => e.locationId === locationId && calcDecay(e.ts, e.type) > 0)
    .sort((a, b) => b.ts - a.ts)
}

// Remove eventos expirados usando TTL por tipo
export function filterLiveEvents(events) {
  return events.filter(e => calcDecay(e.ts, e.type) > 0)
}

export function timeAgo(ts) {
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins === 0) return 'agora'
  if (mins === 1) return 'há 1 min'
  return `há ${mins} min`
}

export function strengthLabel(ts, type = null) {
  const age = Date.now() - ts
  const { strong, medium } = type
    ? getDecayThresholds(type)
    : { strong: 10*60*1000, medium: 30*60*1000 }

  if (age <= strong) return { label: 'forte', color: '#ff2d55' }
  if (age <= medium) return { label: 'médio', color: '#ffcc00' }
  return { label: 'fraco', color: '#6666aa' }
}

// Retorna tempo restante formatado para um evento
export function timeRemaining(ts, type = null) {
  const { expiry } = type
    ? getDecayThresholds(type)
    : { expiry: 60*60*1000 }
  const remaining = expiry - (Date.now() - ts)
  if (remaining <= 0) return null
  const mins = Math.ceil(remaining / 60000)
  if (mins < 60) return `expira em ${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `expira em ${h}h${m}min` : `expira em ${h}h`
}
