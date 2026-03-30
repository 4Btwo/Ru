// ── PAINEL DO DONO ────────────────────────────────────────────────────────────
// Atualiza lotação, descrição e info do estabelecimento
import { useCallback } from 'react'
import { ref, update } from 'firebase/database'
import { db } from '../lib/firebase'

export function useOwner(locationId, uid) {
  const isOwner = useCallback((place) => {
    return place?.createdBy === uid
  }, [uid])

  // Atualiza lotação (0–100) e status (open/busy/full/closed)
  const setOccupancy = useCallback(async (percent) => {
    if (!locationId) return
    const status =
      percent === null ? 'open' :
      percent >= 90    ? 'full' :
      percent >= 60    ? 'busy' : 'open'

    await update(ref(db, `places/${locationId}`), {
      occupancy:       percent,
      occupancyStatus: status,
      occupancyUpdAt:  Date.now(),
    })
  }, [locationId])

  // Salva descrição e info do estabelecimento
  const saveDescription = useCallback(async ({ description, schedule, instagram, phone }) => {
    if (!locationId) return
    await update(ref(db, `places/${locationId}`), {
      description: description?.trim() || null,
      schedule:    schedule?.trim()    || null,
      instagram:   instagram?.trim()   || null,
      phone:       phone?.trim()       || null,
      updatedAt:   Date.now(),
    })
  }, [locationId])

  return { isOwner, setOccupancy, saveDescription }
}
