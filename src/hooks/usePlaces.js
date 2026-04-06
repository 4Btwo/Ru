import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue } from 'firebase/database'
import { db } from '../lib/firebase'
import { LOCATIONS } from '../lib/constants'

export function usePlaces(uid) {
  const [userPlaces, setUserPlaces] = useState([])

  useEffect(() => {
    // Só escuta depois de autenticado
    if (!uid) return

    const unsub = onValue(ref(db, 'places'), snap => {
      const data = snap.val()
      if (!data) return setUserPlaces([])
      const now  = Date.now()
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        // Remove temporários já expirados
        .filter(p => !p.expiresAt || p.expiresAt > now)
      setUserPlaces(list)
    }, (error) => {
      console.warn('[usePlaces] erro:', error.message)
    })
    return unsub
  }, [uid])

  const allPlaces = [
    ...LOCATIONS,
    ...userPlaces.filter(p => !LOCATIONS.find(l => l.id === p.id)),
  ]

  const addPlace = useCallback(async (placeData, userId, userName) => {
    const { name, cat, lat, lng, status, needsModeration, isFixed, expiresAt, durationHours } = placeData
    const newRef = await push(ref(db, 'places'), {
      name, cat, lat, lng,
      createdBy:   userId,
      createdName: userName,
      createdAt:   Date.now(),
      status:      status ?? 'approved',
      ...(needsModeration ? { needsModeration: true } : {}),
      ...(isFixed !== undefined ? { isFixed } : {}),
      ...(expiresAt    ? { expiresAt }    : {}),
      ...(durationHours ? { durationHours } : {}),
    })
    return newRef.key
  }, [])

  return { allPlaces, userPlaces, addPlace }
}
