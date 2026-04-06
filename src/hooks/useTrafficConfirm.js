// ── CONFIRMAÇÃO DE TRÂNSITO — notifica ao passar pelo local ──────────────────
// Quando o usuário está dentro do raio de um evento de trânsito ativo,
// dispara uma notificação pedindo confirmação se ainda está acontecendo.

import { useEffect, useRef, useCallback } from 'react'
import { ref, push, update, increment } from 'firebase/database'
import { db } from '../lib/firebase'
import { EVENT_META } from '../lib/constants'

const CONFIRM_RADIUS_KM = 0.3     // 300m de raio para disparar
const CONFIRM_COOLDOWN  = 20 * 60 * 1000  // só pergunta a cada 20 min por local
const TRAFFIC_TYPES     = ['pesado', 'bloqueio', 'acidente', 'blitz']

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function useTrafficConfirm({ userPos, events, places, user, onConfirmPrompt }) {
  const cooldowns = useRef({})  // locationId → timestamp da última pergunta

  const checkProximity = useCallback(() => {
    if (!userPos || !user) return

    const now = Date.now()

    // Pega eventos de trânsito ativos
    const activeTraffic = events.filter(ev =>
      TRAFFIC_TYPES.includes(ev.type) &&
      now - ev.ts < 30 * 60 * 1000  // dentro de 30 min
    )

    // Agrupa por location
    const byLocation = {}
    activeTraffic.forEach(ev => {
      if (!byLocation[ev.locationId]) byLocation[ev.locationId] = []
      byLocation[ev.locationId].push(ev)
    })

    Object.entries(byLocation).forEach(([locationId, evs]) => {
      // Verifica cooldown
      const lastAsked = cooldowns.current[locationId] || 0
      if (now - lastAsked < CONFIRM_COOLDOWN) return

      // Acha o place
      const place = places.find(p => p.id === locationId)
      if (!place) return

      // Verifica distância
      const dist = haversineKm(userPos.lat, userPos.lng, place.lat, place.lng)
      if (dist > CONFIRM_RADIUS_KM) return

      // Está perto! Marca cooldown e dispara prompt
      cooldowns.current[locationId] = now
      const domType = evs.sort((a,b) => b.ts - a.ts)[0].type
      onConfirmPrompt({
        place,
        type: domType,
        events: evs,
      })
    })
  }, [userPos, events, places, user, onConfirmPrompt])

  // Checa a cada 60 segundos
  useEffect(() => {
    const interval = setInterval(checkProximity, 60_000)
    return () => clearInterval(interval)
  }, [checkProximity])

  // Confirmar que ainda acontece (+peso no score)
  const confirmStillHappening = useCallback(async (locationId, type) => {
    if (!user) return
    await push(ref(db, 'events'), {
      locationId,
      type,
      userId:      user.uid,
      userName:    user.name,
      userReports: user.reports || 0,
      ts:          Date.now(),
      isConfirmation: true,   // flag especial
    })
    await update(ref(db, `users/${user.uid}`), {
      score:   increment(5),
      reports: increment(1),
    })
  }, [user])

  // Marcar como resolvido (evento terminou)
  const markResolved = useCallback(async (locationId, type) => {
    if (!user) return
    // Adiciona evento "morto" para derrubar o score
    await push(ref(db, 'events'), {
      locationId,
      type:     'morto',
      userId:   user.uid,
      userName: user.name,
      ts:       Date.now(),
      isResolution: true,
    })
    await update(ref(db, `users/${user.uid}`), {
      score:   increment(8),  // bônus maior por resolver
      reports: increment(1),
    })
  }, [user])

  return { confirmStillHappening, markResolved }
}
