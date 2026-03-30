// ── CLOUD FUNCTIONS — Radar Urbano ────────────────────────────────────────────
// Deploy: firebase deploy --only functions
// Requer: firebase-admin, firebase-functions instalados

const functions = require('firebase-functions')
const admin     = require('firebase-admin')

admin.initializeApp()

const db = admin.database()

// Mapa de emojis/labels por tipo de evento
const EVENT_META = {
  cheio:    { emoji: '🍻', label: 'Lotado',          weight: 1 },
  evento:   { emoji: '🎉', label: 'Evento ativo',    weight: 2 },
  morto:    { emoji: '😴', label: 'Vazio',           weight: 1 },
  pesado:   { emoji: '🚗', label: 'Trânsito pesado', weight: 2 },
  bloqueio: { emoji: '🚧', label: 'Bloqueio',        weight: 3 },
  acidente: { emoji: '💥', label: 'Acidente',        weight: 3 },
}

// ── 1. RATE LIMIT SERVER-SIDE ─────────────────────────────────────────────────
// Valida: máx 3 reports do mesmo tipo por usuário por minuto
exports.onNewEvent = functions.database
  .ref('/events/{eventId}')
  .onCreate(async (snap, context) => {
    const ev = snap.val()
    if (!ev || !ev.userId || !ev.type || !ev.locationId) {
      await snap.ref.remove()
      return null
    }

    const meta = EVENT_META[ev.type]
    if (!meta) {
      await snap.ref.remove()
      return null
    }

    // ── Rate limit: verifica /rateLimit/{uid}/{type} ──────────────────────────
    const ratePath  = `rateLimit/${ev.userId}/${ev.type}`
    const rateSnap  = await db.ref(ratePath).get()
    const now       = Date.now()
    const window    = 60_000 // 1 minuto
    const maxPerMin = 3

    const recent = rateSnap.exists()
      ? (rateSnap.val() || []).filter(t => now - t < window)
      : []

    if (recent.length >= maxPerMin) {
      // Spam detectado — remove o evento silenciosamente
      console.warn(`Rate limit atingido: ${ev.userId} / ${ev.type}`)
      await snap.ref.remove()
      return null
    }

    // Atualiza janela de timestamps
    await db.ref(ratePath).set([...recent, now])
    // TTL automático: limpa após 2 minutos para não acumular dados
    setTimeout(() => db.ref(ratePath).remove().catch(() => {}), 120_000)

    // ── Busca nome do local ───────────────────────────────────────────────────
    let locationName = ev.locationId
    try {
      const placeSnap = await db.ref(`places/${ev.locationId}`).get()
      if (placeSnap.exists()) locationName = placeSnap.val().name || locationName
    } catch (_) {}

    // ── Push notification ─────────────────────────────────────────────────────
    const title = `${meta.emoji} ${locationName}`
    const body  = `${ev.userName?.split(' ')[0] || 'Alguém'} marcou: ${meta.label}`

    const usersSnap = await db.ref('users').get()
    if (!usersSnap.exists()) return null

    const tokens = []
    usersSnap.forEach(child => {
      const u = child.val()
      if (child.key === ev.userId) return        // não notifica o autor
      if (u?.fcmToken) tokens.push(u.fcmToken)
    })

    if (tokens.length === 0) return null

    // Envia em lotes de 500 (limite FCM)
    const chunks = []
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500))
    }

    await Promise.all(
      chunks.map(chunk =>
        admin.messaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon:    '/icon.png',
              badge:   '/icon.png',
              vibrate: [200, 100, 200],
            },
            fcmOptions: { link: '/' },
          },
          data: {
            locationId: ev.locationId,
            type:       ev.type,
          },
        })
      )
    )

    return null
  })

// ── 2. LIMPEZA DIÁRIA DE TOKENS FCM INVÁLIDOS ─────────────────────────────────
exports.cleanupTokens = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const usersSnap = await db.ref('users').get()
    if (!usersSnap.exists()) return null

    const checks = []
    usersSnap.forEach(child => {
      const token = child.val()?.fcmToken
      if (!token) return
      checks.push({ uid: child.key, token })
    })

    await Promise.all(
      checks.map(async ({ uid, token }) => {
        try {
          await admin.messaging().send({ token, data: { ping: '1' } }, true /* dryRun */)
        } catch (e) {
          if (
            e.code === 'messaging/invalid-registration-token' ||
            e.code === 'messaging/registration-token-not-registered'
          ) {
            await db.ref(`users/${uid}/fcmToken`).remove()
          }
        }
      })
    )

    return null
  })

// ── 3. LIMPEZA DIÁRIA DE EVENTOS ANTIGOS (> 24h) ─────────────────────────────
exports.cleanupOldEvents = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff    = Date.now() - 24 * 60 * 60 * 1000
    const evSnap    = await db.ref('events')
      .orderByChild('ts')
      .endAt(cutoff)
      .get()

    if (!evSnap.exists()) return null

    const updates = {}
    evSnap.forEach(child => { updates[child.key] = null })
    await db.ref('events').update(updates)

    console.log(`Removidos ${Object.keys(updates).length} eventos antigos.`)
    return null
  })
