import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, update } from 'firebase/database'
import { db } from '../lib/firebase'

export function usePlaces(uid) {
  const [allPlaces,  setAllPlaces]  = useState([])
  const [hiddenIds,  setHiddenIds]  = useState(new Set())

  useEffect(() => {
    if (!uid) return

    // Lê todos os locais do Firebase (incluindo os base migrados pelo seed)
    const unsubPlaces = onValue(ref(db, 'places'), snap => {
      const data = snap.val()
      if (!data) return setAllPlaces([])
      const now  = Date.now()
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter(p => {
          // Filtra expirados
          if (p.expiresAt && p.expiresAt <= now) return false
          // Filtra ocultos pelo admin
          if (hiddenIds.has(p.id)) return false
          return true
        })
      setAllPlaces(list)
    }, err => console.warn('[usePlaces] erro:', err.message))

    // Locais ocultos pelo admin (legado — antes da migração)
    const unsubHidden = onValue(ref(db, 'settings/hiddenLocations'), snap => {
      const data = snap.val()
      setHiddenIds(data ? new Set(Object.keys(data).filter(k => data[k])) : new Set())
    }, () => {})

    return () => { unsubPlaces(); unsubHidden() }
  }, [uid])

  const addPlace = useCallback(async (placeData, userId, userName) => {
    const { name, cat, lat, lng, status, needsModeration, isFixed, expiresAt, durationHours } = placeData
    const newRef = await push(ref(db, 'places'), {
      name, cat, lat, lng,
      ownerId:     userId,
      createdBy:   userId,
      createdName: userName,
      createdAt:   Date.now(),
      status:      status ?? 'approved',
      ...(needsModeration   ? { needsModeration: true } : {}),
      ...(isFixed !== undefined ? { isFixed } : {}),
      ...(expiresAt         ? { expiresAt }    : {}),
      ...(durationHours     ? { durationHours } : {}),
    })
    return newRef.key
  }, [])

  const hideBaseLocation = useCallback(async (locationId) => {
    await update(ref(db, 'settings/hiddenLocations'), { [locationId]: true })
  }, [])

  const restoreBaseLocation = useCallback(async (locationId) => {
    await update(ref(db, 'settings/hiddenLocations'), { [locationId]: null })
  }, [])

  // userPlaces = todos que não são base (para compatibilidade)
  const userPlaces = allPlaces.filter(p => !p.isBase)

  return { allPlaces, userPlaces, hiddenIds, addPlace, hideBaseLocation, restoreBaseLocation }
}
