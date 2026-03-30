// ── BLOCO 5.3: FAKE IT UNTIL REAL ────────────────────────────────────────────
// Só roda se banco tiver menos de MIN_REAL eventos.
// Usa o uid do usuário logado para respeitar as regras do Firebase.
import { ref, push, get, query, limitToFirst } from 'firebase/database'
import { db } from './firebase'
import { LOCATIONS } from './constants'

const MIN_REAL   = 5
const SEED_COUNT = 14

const NIGHT_TYPES   = ['cheio', 'evento', 'cheio', 'morto', 'evento']
const TRANSIT_TYPES = ['pesado', 'bloqueio', 'pesado', 'acidente']
const PRIORITY      = ['1','8','4','2','3','7','6','5']

export async function seedIfEmpty(uid, userName) {
  if (!uid) return
  try {
    const snap  = await get(query(ref(db, 'events'), limitToFirst(MIN_REAL)))
    const count = snap.val() ? Object.keys(snap.val()).length : 0
    if (count >= MIN_REAL) return

    console.log('[SEED] Banco vazio — criando dados iniciais...')
    const now = Date.now()
    const promises = []

    for (let i = 0; i < SEED_COUNT; i++) {
      const locId = PRIORITY[i % PRIORITY.length]
      const loc   = LOCATIONS.find(l => l.id === locId)
      if (!loc) continue
      const types  = loc.cat === 'transito' ? TRANSIT_TYPES : NIGHT_TYPES
      const type   = types[i % types.length]
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
    // Silencia — seed é opcional
    console.warn('[SEED] Skipped:', e.message)
  }
}
