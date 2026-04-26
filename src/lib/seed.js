// ── SEED: popula banco com locais base + eventos de exemplo ───────────────────
import { ref, get, set } from 'firebase/database'
import { db } from './firebase'
import { LOCATIONS } from './constants'


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

    // Seed de eventos removido — eventos são criados pelos usuários em tempo real
  } catch (e) {
    console.warn('[SEED] Skipped:', e.message)
  }
}
