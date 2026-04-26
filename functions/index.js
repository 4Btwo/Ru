// ── CLOUD FUNCTIONS — Radar Urbano ────────────────────────────────────────────
const functions = require('firebase-functions')
const admin     = require('firebase-admin')

admin.initializeApp()
const db = admin.database()

const EVENT_META = {
  cheio:    { emoji:'🍻', label:'Lotado',          cat:'noturno',  weight:1 },
  evento:   { emoji:'🎉', label:'Evento ativo',    cat:'noturno',  weight:2 },
  morto:    { emoji:'😴', label:'Vazio',           cat:'noturno',  weight:1 },
  pesado:   { emoji:'🚗', label:'Trânsito pesado', cat:'transito', weight:2 },
  bloqueio: { emoji:'🚧', label:'Bloqueio',        cat:'transito', weight:3 },
  acidente: { emoji:'💥', label:'Acidente',        cat:'transito', weight:3 },
  blitz:    { emoji:'🚔', label:'Blitz',           cat:'transito', weight:3 },
}

const TRANSIT_TYPES  = new Set(['pesado','bloqueio','acidente','blitz'])
const NOTURNO_TYPES  = new Set(['cheio','evento','morto'])

// ── 1. RATE LIMIT SERVER-SIDE ─────────────────────────────────────────────────
exports.onNewEvent = functions.database
  .ref('/events/{eventId}')
  .onCreate(async (snap, context) => {
    const ev = snap.val()
    if (!ev?.userId || !ev?.type || !ev?.locationId) {
      await snap.ref.remove(); return null
    }
    const meta = EVENT_META[ev.type]
    if (!meta) { await snap.ref.remove(); return null }

    const ratePath = `rateLimit/${ev.userId}/${ev.type}`
    const rateSnap = await db.ref(ratePath).get()
    const now      = Date.now()
    const window   = 60_000
    const maxPerMin = 3

    const recent = rateSnap.exists()
      ? (rateSnap.val() || []).filter(t => now - t < window)
      : []

    if (recent.length >= maxPerMin) {
      console.warn(`Rate limit: ${ev.userId} / ${ev.type}`)
      await snap.ref.remove(); return null
    }

    await db.ref(ratePath).set([...recent, now])
    setTimeout(() => db.ref(ratePath).remove().catch(() => {}), 120_000)

    // Push notification
    let locationName = ev.locationId
    try {
      const placeSnap = await db.ref(`places/${ev.locationId}`).get()
      if (placeSnap.exists()) locationName = placeSnap.val().name || locationName
    } catch (_) {}

    const title = `${meta.emoji} ${locationName}`
    const body  = `${ev.userName?.split(' ')[0] || 'Alguém'} marcou: ${meta.label}`

    const usersSnap = await db.ref('users').get()
    if (!usersSnap.exists()) return null

    const tokens = []
    usersSnap.forEach(child => {
      const u = child.val()
      if (child.key === ev.userId) return
      if (u?.fcmToken) tokens.push(u.fcmToken)
    })
    if (tokens.length === 0) return null

    const chunks = []
    for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500))
    await Promise.all(chunks.map(chunk =>
      admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        webpush: {
          notification: { title, body, icon:'/icon.png', badge:'/icon.png', vibrate:[200,100,200] },
          fcmOptions: { link:'/' },
        },
        data: { locationId: ev.locationId, type: ev.type },
      })
    ))
    return null
  })

// ── 2. RESET DAS 6H — zera trânsito e noturno da madrugada ───────────────────
// Roda todo dia às 6h (horário de Brasília = UTC-3 = 9h UTC)
exports.resetMorning = functions.pubsub
  .schedule('0 9 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const snap = await db.ref('events').get()
    if (!snap.exists()) return null

    const now    = Date.now()
    const fourH  = 4 * 60 * 60 * 1000
    const updates = {}

    snap.forEach(child => {
      const ev = child.val()
      // Remove todos os reports noturnos (baladas fecham às 6h)
      // Remove reports de trânsito com mais de 4 horas
      if (NOTURNO_TYPES.has(ev.type)) {
        updates[child.key] = null
      } else if (TRANSIT_TYPES.has(ev.type) && (now - ev.ts) > fourH) {
        updates[child.key] = null
      }
    })

    const count = Object.keys(updates).length
    if (count > 0) await db.ref('events').update(updates)
    console.log(`[resetMorning] ${count} eventos removidos.`)
    return null
  })

// ── 3. RESET DO MEIO-DIA — limpa trânsito antigo ─────────────────────────────
// Roda todo dia às 12h de Brasília
exports.resetNoon = functions.pubsub
  .schedule('0 12 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const snap = await db.ref('events').get()
    if (!snap.exists()) return null

    const now   = Date.now()
    const twoH  = 2 * 60 * 60 * 1000
    const updates = {}

    snap.forEach(child => {
      const ev = child.val()
      if (TRANSIT_TYPES.has(ev.type) && (now - ev.ts) > twoH) {
        updates[child.key] = null
      }
    })

    const count = Object.keys(updates).length
    if (count > 0) await db.ref('events').update(updates)
    console.log(`[resetNoon] ${count} eventos de trânsito antigos removidos.`)
    return null
  })

// ── 4. LIMPEZA HORÁRIA — expira reports pelo tempo natural ───────────────────
// Trânsito: expira em 60 min. Noturno: expira em 4 horas.
exports.cleanupExpired = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
    const snap = await db.ref('events').get()
    if (!snap.exists()) return null

    const now      = Date.now()
    const transitEx = 60 * 60 * 1000       // 1 hora
    const noturnoEx = 4  * 60 * 60 * 1000  // 4 horas
    const updates   = {}

    snap.forEach(child => {
      const ev  = child.val()
      const age = now - ev.ts
      if (TRANSIT_TYPES.has(ev.type)  && age > transitEx) updates[child.key] = null
      if (NOTURNO_TYPES.has(ev.type)  && age > noturnoEx) updates[child.key] = null
    })

    const count = Object.keys(updates).length
    if (count > 0) await db.ref('events').update(updates)
    console.log(`[cleanupExpired] ${count} eventos expirados removidos.`)
    return null
  })

// ── 5. LIMPEZA DE TOKENS FCM INVÁLIDOS ───────────────────────────────────────
exports.cleanupTokens = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const usersSnap = await db.ref('users').get()
    if (!usersSnap.exists()) return null

    const checks = []
    usersSnap.forEach(child => {
      const token = child.val()?.fcmToken
      if (token) checks.push({ uid: child.key, token })
    })

    await Promise.all(checks.map(async ({ uid, token }) => {
      try {
        await admin.messaging().send({ token, data:{ ping:'1' } }, true)
      } catch (e) {
        if (
          e.code === 'messaging/invalid-registration-token' ||
          e.code === 'messaging/registration-token-not-registered'
        ) {
          await db.ref(`users/${uid}/fcmToken`).remove()
        }
      }
    }))
    return null
  })

// ── 6. EXPIRAÇÃO DE LOCAIS TEMPORÁRIOS ───────────────────────────────────────
exports.cleanupExpiredPlaces = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
    const snap = await db.ref('places').get()
    if (!snap.exists()) return null

    const now     = Date.now()
    const updates = {}
    snap.forEach(child => {
      const p = child.val()
      if (p.expiresAt && p.expiresAt < now) updates[child.key] = null
    })

    const count = Object.keys(updates).length
    if (count > 0) await db.ref('places').update(updates)
    console.log(`[cleanupExpiredPlaces] ${count} locais temporários expirados removidos.`)
    return null
  })
