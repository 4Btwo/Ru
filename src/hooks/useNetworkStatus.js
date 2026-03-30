// hooks/useNetworkStatus.js
// Detecta conexão com internet e conectividade com o Firebase RTDB.
// Retorna: 'online' | 'offline' | 'firebase-error'

import { useState, useEffect } from 'react'
import { ref, onValue } from 'firebase/database'
import { db } from '../lib/firebase'

export function useNetworkStatus() {
  const [status, setStatus] = useState('online')

  useEffect(() => {
    // 1. Escuta eventos nativos de rede
    const handleOnline  = () => setStatus('online')
    const handleOffline = () => setStatus('offline')
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    // 2. Escuta conectividade real com o Firebase
    const connRef = ref(db, '.info/connected')
    let firebaseTimer = null

    const unsub = onValue(connRef, snap => {
      if (snap.val() === true) {
        clearTimeout(firebaseTimer)
        setStatus('online')
      } else {
        // Aguarda 4s antes de mostrar erro (reconexões rápidas não geram banner)
        firebaseTimer = setTimeout(() => {
          if (!navigator.onLine) {
            setStatus('offline')
          } else {
            setStatus('firebase-error')
          }
        }, 4000)
      }
    }, () => {
      setStatus('firebase-error')
    })

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearTimeout(firebaseTimer)
      unsub()
    }
  }, [])

  return status
}
