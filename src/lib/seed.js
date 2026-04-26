// ── SEED: popula banco com locais base + eventos de exemplo ───────────────────
import { ref, push, get, set, query, limitToFirst } from 'firebase/database'
import { db } from './firebase'
import { LOCATIONS } from './constants'

const MIN_REAL   = 5
const SEED_COUNT = 14

const NIGHT_TYPES   = ['cheio', 'evento', 'cheio', 'morto', 'evento']
const TRANSIT_TYPES = ['pesado', 'bloqueio', 'pesado', 'acidente']
const PRIORITY      = ['1','8','4','2','3','7','6','5']

/**
 * Migra os LOCATIONS hardcoded para o Firebase (roda só uma vez).
 * Depois disso o admin pode deletar/editar normalmente pelo painel.
 */
async function seedBaseLocations(uid) {
  const snap = await get(ref(db, 'settings/baseLocationsMigrated'))
  if (snap.val() === true) return  // já migrou

  console.log('[SEED] Migrando locais base para o Firebase...')
  const promises = LOCATIONS.map(loc =>
    set(ref(db, `places/${loc.id}`), {
      ...loc,
      ownerId:     uid,
      createdBy:   uid,
      createdName: 'Sistema',
      createdAt:   Date.now(),
      status:      'approved',
      isBase:      true,   // marca como local base (info apenas)
    })
  )
  await Promise.all(promises)
  await set(ref(db, 'settings/baseLocationsMigrated'), true)
  console.log(`[SEED] ${LOCATIONS.length} locais base migrados.`)
}

export async function seedIfEmpty(uid, userName) {
  if (!uid) return
  try {
    // 1. Migra locais base para o Firebase (idempotente)
    await seedBaseLocations(uid)

    // 2. Seed de eventos de exemplo se banco vazio
    const snap  = await get(query(ref(db, 'events'), limitToFirst(MIN_REAL)))
    const count = snap.val() ? Object.keys(snap.val()).length : 0
    if (count >= MIN_REAL) return

    console.log('[SEED] Banco vazio — criando eventos iniciais...')
    const now = Date.now()
    const promises = []

    for (let i = 0; i < SEED_COUNT; i++) {
      const locId = PRIORITY[i % PRIORITY.length]
      const loc   = LOCATIONS.find(l => l.id === locId)
      if (!loc) continue
      const types   = loc.cat === 'transito' ? TRANSIT_TYPES : NIGHT_TYPES
      const type    = types[i % types.length]
      const ageMins = Math.floor((i / SEED_COUNT) * 28)
      promises.push(push(ref(db, 'events'), {
        locationId: locId, type,
        userId: uid, userName: userName || 'Radar Bot',
        userReports: 10,
        ts: now - ageMins * 60 * 1000,
        simulated: true,
      }))
    }
    await Promise.all(promises)
    console.log(`[SEED] ${SEED_COUNT} eventos criados.`)
  } catch (e) {
    console.warn('[SEED] Skipped:', e.message)
  }
}
