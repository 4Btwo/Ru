// ── SHARE ENGINE — Bloco 4: viralização ──────────────────────────────────────
import { LOCATIONS, EVENT_META, getFomoLabel } from './constants'
import { calcScore, getHeatLevel, getActiveEvents } from './hotspot'

/**
 * Gera texto para compartilhamento nativo (WhatsApp/Instagram)
 */
export function buildShareText(location, events, usersMap = {}) {
  const score    = calcScore(location.id, events, usersMap)
  const heat     = getHeatLevel(score)
  const actEvts  = getActiveEvents(location.id, events)
  const count    = actEvts.length

  if (heat === 'inactive' || count === 0) {
    return `📍 ${location.name} — tranquilo agora.\nVeja ao vivo: Urbyn`
  }

  const fomoLabel = getFomoLabel(heat, location.cat)
  const topTypes  = [...new Set(actEvts.map(e => e.type))].slice(0, 2)
  const emojis    = topTypes.map(t => EVENT_META[t]?.emoji || '').join(' ')

  const lines = [
    `${emojis} ${fomoLabel}`,
    ``,
    `📍 ${location.name}`,
    `👥 ${count} reporte${count > 1 ? 's' : ''} agora`,
    ``,
    `Acompanhe ao vivo pelo Urbyn 🔴`,
  ]

  return lines.join('\n')
}

/**
 * Share nativo via Web Share API — fallback para clipboard
 */
export async function shareLocation(location, events, usersMap = {}) {
  const text  = buildShareText(location, events, usersMap)
  const title = `Urbyn — ${location.name}`

  // Web Share API (mobile)
  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
    }
  }

  // Fallback: copia para clipboard
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'error'
  }
}

/**
 * Gera link direto para WhatsApp com texto pré-preenchido
 */
export function whatsappShareUrl(location, events, usersMap = {}) {
  const text = buildShareText(location, events, usersMap)
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
