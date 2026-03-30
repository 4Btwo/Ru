// ── ALERTAS INTELIGENTES — Bloco 4.4 ─────────────────────────────────────────
// Detecta quando um local "esquentou" e dispara push notification
// Roda no cliente — monitora mudanças de heat level entre renders

import { getHeatLevel, calcScore } from './hotspot'
import { LOCATIONS, getFomoLabel } from './constants'

// Guarda o último heat level de cada local para detectar mudanças
const lastHeat = {}

/**
 * Chama após cada atualização de eventos.
 * Se um local subiu de nível (ex: low→hot), dispara notificação.
 */
export function checkAlerts(events, usersMap = {}) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  LOCATIONS.forEach(loc => {
    const score   = calcScore(loc.id, events, usersMap)
    const heat    = getHeatLevel(score)
    const prev    = lastHeat[loc.id]
    lastHeat[loc.id] = heat

    // Só notifica se subiu de nível (não na primeira vez)
    if (!prev) return
    if (prev === heat) return
    if (heat === 'inactive' || heat === 'low') return

    // Subiu para mid ou hot
    const escalated = (prev === 'inactive' || prev === 'low') ||
                      (prev === 'mid' && heat === 'hot')
    if (!escalated) return

    const fomo  = getFomoLabel(heat, loc.cat)
    const emoji = loc.cat === 'transito' ? '🚨' : '🔥'

    try {
      new Notification(`${emoji} ${fomo}`, {
        body: `📍 ${loc.name} — reportes aumentando agora`,
        icon: '/icon.png',
        badge: '/icon.png',
        tag:  `hotspot_${loc.id}`,   // evita duplicatas
        renotify: false,
      })
    } catch (e) {
      console.warn('[ALERT]', e)
    }
  })
}
