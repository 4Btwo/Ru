// ── HISTÓRICO POR DIA/HORA ────────────────────────────────────────────────────
// Lê os eventos do Firebase e agrupa por dia da semana + faixa de hora,
// retornando um perfil de movimento histórico para o local.
import { useState, useEffect } from 'react'
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database'
import { db } from '../lib/firebase'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOUR_SLOTS = [
  { label: '00–06', start: 0,  end: 6  },
  { label: '06–12', start: 6,  end: 12 },
  { label: '12–18', start: 12, end: 18 },
  { label: '18–24', start: 18, end: 24 },
]

// Retorna faixa de hora de 0–3
function getSlot(hour) {
  return HOUR_SLOTS.findIndex(s => hour >= s.start && hour < s.end)
}

export function useHistory(locationId) {
  const [history, setHistory] = useState(null) // { byDay: [], byHour: [], peakLabel }

  useEffect(() => {
    if (!locationId) return

    // Pega os últimos 2000 eventos globais — filtra por locationId no cliente
    const q = query(ref(db, 'events'), orderByChild('ts'), limitToLast(2000))
    const unsub = onValue(q, (snap) => {
      const data = snap.val()
      if (!data) { setHistory(null); return }

      const all = Object.values(data).filter(e => e.locationId === locationId)
      if (all.length < 3) { setHistory(null); return } // dados insuficientes

      // Acumuladores
      const dayCount  = Array(7).fill(0)   // [Dom, Seg, ..., Sáb]
      const slotCount = Array(4).fill(0)   // [madrugada, manhã, tarde, noite]

      all.forEach(ev => {
        const d = new Date(ev.ts)
        dayCount[d.getDay()]++
        const slot = getSlot(d.getHours())
        if (slot >= 0) slotCount[slot]++
      })

      // Normaliza 0–100
      const dayMax  = Math.max(...dayCount,  1)
      const slotMax = Math.max(...slotCount, 1)

      const byDay = DAYS.map((label, i) => ({
        label,
        count: dayCount[i],
        pct: Math.round((dayCount[i] / dayMax) * 100),
      }))

      const byHour = HOUR_SLOTS.map((s, i) => ({
        label: s.label,
        count: slotCount[i],
        pct: Math.round((slotCount[i] / slotMax) * 100),
      }))

      // Dia e horário de pico
      const peakDayIdx  = dayCount.indexOf(Math.max(...dayCount))
      const peakSlotIdx = slotCount.indexOf(Math.max(...slotCount))
      const peakLabel   = `${DAYS[peakDayIdx]}s às ${HOUR_SLOTS[peakSlotIdx].label}h`

      setHistory({ byDay, byHour, peakLabel, total: all.length })
    })

    return unsub
  }, [locationId])

  return { history }
}
