// ── CHAT DO LOCAL ─────────────────────────────────────────────────────────────
// Mensagens + fotos em tempo real por local via Realtime Database
import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, query, orderByChild, limitToLast, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

export function useChat(locationId, uid) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!locationId || !uid) return
    const q = query(
      ref(db, `chats/${locationId}`),
      orderByChild('ts'),
      limitToLast(60)
    )
    const unsub = onValue(q, snap => {
      const data = snap.val()
      if (!data) return setMessages([])
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => a.ts - b.ts)
      setMessages(list)
    }, err => console.warn('[useChat]', err.message))
    return unsub
  }, [locationId, uid])

  const sendMessage = useCallback(async ({ text, imageUrl, userName, userPhoto }) => {
    if (!locationId || !uid) return
    await push(ref(db, `chats/${locationId}`), {
      text:      text?.trim() || null,
      imageUrl:  imageUrl || null,
      userId:    uid,
      userName,
      userPhoto,
      ts:        serverTimestamp(),
    })
  }, [locationId, uid])

  return { messages, sendMessage }
}
