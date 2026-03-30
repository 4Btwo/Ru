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
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }))
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

  const addPlace = useCallback(async ({ name, cat, lat, lng }, userId, userName) => {
    const newRef = await push(ref(db, 'places'), {
      name, cat, lat, lng,
      createdBy:   userId,
      createdName: userName,
      createdAt:   Date.now(),
    })
    return newRef.key
  }, [])

  return { allPlaces, userPlaces, addPlace }
}
