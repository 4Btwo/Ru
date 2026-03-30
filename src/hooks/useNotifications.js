import { useEffect, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { ref, set } from 'firebase/database'
import { messaging, db } from '../lib/firebase'
import { VAPID_KEY } from '../lib/constants'

export function useNotifications(uid) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const requestPermission = async () => {
    if (!messaging || !uid) return
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm === 'granted') {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY })
        if (token) await set(ref(db, `users/${uid}/fcmToken`), token)
      }
    } catch (e) { console.warn('[FCM]', e) }
  }

  useEffect(() => {
    if (uid && messaging && Notification.permission === 'granted') requestPermission()
  }, [uid])

  useEffect(() => {
    if (!messaging) return
    return onMessage(messaging, payload => {
      if (Notification.permission === 'granted') {
        new Notification(payload.notification?.title || 'Radar Urbano', {
          body: payload.notification?.body || '',
          icon: '/icon.png',
        })
      }
    })
  }, [])

  return { permission, requestPermission }
}
