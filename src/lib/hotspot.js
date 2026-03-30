// ── MOTOR DE HOTSPOT ──────────────────────────────────────────────────────────
import { EVENT_META, EXPIRY_MS, STRONG_MS, MEDIUM_MS, reputationMultiplier } from './constants'

// Decay por tempo
export function calcDecay(ts) {
  const age = Date.now() - ts
  if (age >= EXPIRY_MS) return 0
  if (age <= STRONG_MS) return 1.0
  if (age <= MEDIUM_MS) {
    const t = (age - STRONG_MS) / (MEDIUM_MS - STRONG_MS)
    return 1.0 - t * 0.7
  }
  const t = (age - MEDIUM_MS) / (EXPIRY_MS - MEDIUM_MS)
  return 0.3 - t * 0.3
}

// Score bruto (para tamanho do marcador e intensidade)
export function calcScore(locationId, events, usersMap = {}) {
  return events
    .filter(e => e.locationId === locationId)
    .reduce((acc, ev) => {
      const decay   = calcDecay(ev.ts)
      if (decay <= 0) return acc
      const weight  = EVENT_META[ev.type]?.weight || 1
      const rep     = reputationMultiplier(usersMap[ev.userId]?.reports || 0)
      return acc + weight * decay * rep
    }, 0)
}

// Heat level pelo score (para tamanho/glow do marcador)
export function getHeatLevel(score) {
  if (score >= 6) return 'hot'
  if (score >= 2) return 'mid'
  if (score > 0)  return 'low'
  return 'inactive'
}

// ── TIPO DOMINANTE ────────────────────────────────────────────────────────────
// Calcula qual tipo de evento tem maior peso acumulado nos últimos X minutos.
// Isso é o que determina o STATUS REAL do local.
export function getDominantType(locationId, events, usersMap = {}) {
  const active = events.filter(e =>
    e.locationId === locationId && calcDecay(e.ts) > 0
  )
  if (active.length === 0) return null

  // Soma peso * decay por tipo
  const scores = {}
  active.forEach(ev => {
    const decay  = calcDecay(ev.ts)
    const weight = EVENT_META[ev.type]?.weight || 1
    const rep    = reputationMultiplier(usersMap[ev.userId]?.reports || 0)
    scores[ev.type] = (scores[ev.type] || 0) + weight * decay * rep
  })

  // Retorna o tipo com maior score
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
}

// ── STATUS REAL DO LOCAL ──────────────────────────────────────────────────────
// Combina tipo dominante + intensidade para gerar o status correto.
// Esta é a função que alimenta o label do popup e o marcador no mapa.
export function getLocationStatus(locationId, events, usersMap = {}) {
  const score   = calcScore(locationId, events, usersMap)
  const heat    = getHeatLevel(score)
  const domType = getDominantType(locationId, events, usersMap)

  if (!domType || heat === 'inactive') {
    return { heat: 'inactive', domType: null, label: 'SEM ATIVIDADE', color: '#3a3a5a', emoji: '⚪', score }
  }

  const meta = EVENT_META[domType]

  // Tipos negativos/neutros: local está vazio ou com problema leve
  if (domType === 'morto') {
    return { heat: 'low', domType, label: 'POUCO MOVIMENTO 😴', color: '#6666aa', emoji: '😴', score }
  }

  // Trânsito
  if (domType === 'pesado') {
    return { heat, domType, label: heat === 'hot' ? 'TRÂNSITO INTENSO 🚗' : 'TRÂNSITO PESADO 🚗', color: '#ff6b35', emoji: '🚗', score }
  }
  if (domType === 'bloqueio') {
    return { heat, domType, label: 'VIA BLOQUEADA 🚧', color: '#ffcc00', emoji: '🚧', score }
  }
  if (domType === 'acidente') {
    return { heat, domType, label: 'ACIDENTE NA VIA 💥', color: '#ff2d55', emoji: '💥', score }
  }

  // Noturno positivo
  if (domType === 'cheio') {
    return {
      heat, domType, score,
      label:  heat === 'hot' ? 'LOTADO AGORA 🔥' : 'ENCHENDO 🍻',
      color:  heat === 'hot' ? '#ff2d55' : '#bf5fff',
      emoji:  '🍻',
    }
  }
  if (domType === 'evento') {
    return {
      heat, domType, score,
      label:  heat === 'hot' ? 'EVENTO BOMBANDO 🎉' : 'EVENTO ROLANDO 🎉',
      color:  '#bf5fff',
      emoji:  '🎉',
    }
  }

  // Fallback genérico
  return { heat, domType, label: meta?.label?.toUpperCase() || 'ATIVO', color: meta?.color || '#ffcc00', emoji: meta?.emoji || '⚡', score }
}

// Eventos ativos de um local, mais recentes primeiro
export function getActiveEvents(locationId, events) {
  const now = Date.now()
  return events
    .filter(e => e.locationId === locationId && (now - e.ts) < EXPIRY_MS)
    .sort((a, b) => b.ts - a.ts)
}

// Remove eventos expirados
export function filterLiveEvents(events) {
  return events.filter(e => calcDecay(e.ts) > 0)
}

// "agora", "há 1 min", "há 5 min"
export function timeAgo(ts) {
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins === 0) return 'agora'
  if (mins === 1) return 'há 1 min'
  return `há ${mins} min`
}

// Força do sinal pelo tempo
export function strengthLabel(ts) {
  const age = Date.now() - ts
  if (age <= STRONG_MS) return { label: 'forte', color: '#ff2d55' }
  if (age <= MEDIUM_MS) return { label: 'médio', color: '#ffcc00' }
  return { label: 'fraco', color: '#6666aa' }
}
