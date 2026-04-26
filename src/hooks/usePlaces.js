import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, update } from 'firebase/database'
import { db } from '../lib/firebase'
import { LOCATIONS } from '../lib/constants'

export function usePlaces(uid) {
  const [userPlaces,    setUserPlaces]    = useState([])
  const [hiddenIds,     setHiddenIds]     = useState(new Set())

  useEffect(() => {
    if (!uid) return

    // ── Firebase places ───────────────────────────────────────────────────────
    const unsubPlaces = onValue(ref(db, 'places'), snap => {
      const data = snap.val()
      if (!data) return setUserPlaces([])
      const now  = Date.now()
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter(p => !p.expiresAt || p.expiresAt > now)
      setUserPlaces(list)
    }, err => console.warn('[usePlaces] erro:', err.message))

    // ── Locais base ocultos pelo admin ────────────────────────────────────────
    // Quando o admin "exclui" um local do LOCATIONS (hardcoded), o ID vai
    // para settings/hiddenLocations — assim ele desaparece do mapa sem
    // precisar remover o código.
    const unsubHidden = onValue(ref(db, 'settings/hiddenLocations'), snap => {
      const data = snap.val()
      setHiddenIds(data ? new Set(Object.keys(data).filter(k => data[k])) : new Set())
    }, () => {})

    return () => { unsubPlaces(); unsubHidden() }
  }, [uid])

  // Mescla hardcoded + Firebase, respeitando locais ocultos pelo admin
  const allPlaces = [
    ...LOCATIONS.filter(l => !hiddenIds.has(l.id)),
    ...userPlaces.filter(p => !LOCATIONS.find(l => l.id === p.id)),
  ]

  const addPlace = useCallback(async (placeData, userId, userName) => {
    const { name, cat, lat, lng, status, needsModeration, isFixed, expiresAt, durationHours } = placeData
    const newRef = await push(ref(db, 'places'), {
      name, cat, lat, lng,
      ownerId:     userId,
      createdBy:   userId,
      createdName: userName,
      createdAt:   Date.now(),
      status:      status ?? 'approved',
      ...(needsModeration  ? { needsModeration: true } : {}),
      ...(isFixed !== undefined ? { isFixed } : {}),
      ...(expiresAt    ? { expiresAt }    : {}),
      ...(durationHours ? { durationHours } : {}),
    })
    return newRef.key
  }, [])

  // Oculta um local base (hardcoded) para todos os usuários
  const hideBaseLocation = useCallback(async (locationId) => {
    await update(ref(db, 'settings/hiddenLocations'), { [locationId]: true })
  }, [])

  // Restaura um local base que estava oculto
  const restoreBaseLocation = useCallback(async (locationId) => {
    await update(ref(db, 'settings/hiddenLocations'), { [locationId]: null })
  }, [])

  return { allPlaces, userPlaces, hiddenIds, addPlace, hideBaseLocation, restoreBaseLocation }
}
