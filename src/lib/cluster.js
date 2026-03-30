// ── CLUSTERIZAÇÃO GEOGRÁFICA — Bloco 1.3C ────────────────────────────────────
// Agrupa locais próximos para evitar poluição visual no mapa
// Usa algoritmo simples de grid-based clustering
import { calcScore, getHeatLevel } from './hotspot'
import { EVENT_META } from './constants'

const CLUSTER_RADIUS_DEG = 0.008  // ~900m em graus lat/lng

/**
 * Agrupa locais que estão dentro de CLUSTER_RADIUS_DEG entre si.
 * Retorna lista de clusters, cada um com:
 *   - lat/lng (centroide ponderado pelo score)
 *   - locations[] (locais agrupados)
 *   - totalScore (soma dos scores)
 *   - heat (nível do cluster)
 *   - count (total de eventos)
 */
export function clusterLocations(locations, events, usersMap = {}, zoomLevel = 14) {
  // Em zoom alto (≥ 15) mostra individual, sem clustering
  if (zoomLevel >= 15) {
    return locations.map(loc => ({
      id:         loc.id,
      lat:        loc.lat,
      lng:        loc.lng,
      locations:  [loc],
      totalScore: calcScore(loc.id, events, usersMap),
      heat:       getHeatLevel(calcScore(loc.id, events, usersMap)),
      count:      events.filter(e => e.locationId === loc.id).length,
      isCluster:  false,
    }))
  }

  // Raio adaptativo por zoom
  const radius = zoomLevel >= 13 ? CLUSTER_RADIUS_DEG : CLUSTER_RADIUS_DEG * 2

  const visited = new Set()
  const clusters = []

  locations.forEach(loc => {
    if (visited.has(loc.id)) return
    visited.add(loc.id)

    // Encontra vizinhos dentro do raio
    const neighbors = locations.filter(other => {
      if (visited.has(other.id)) return false
      const d = Math.sqrt((loc.lat - other.lat)**2 + (loc.lng - other.lng)**2)
      return d < radius
    })

    if (neighbors.length === 0) {
      // Ponto isolado — retorna como está
      const score = calcScore(loc.id, events, usersMap)
      clusters.push({
        id:        loc.id,
        lat:       loc.lat, lng: loc.lng,
        locations: [loc],
        totalScore: score,
        heat:      getHeatLevel(score),
        count:     events.filter(e => e.locationId === loc.id).length,
        isCluster: false,
      })
    } else {
      // Agrupa com vizinhos
      neighbors.forEach(n => visited.add(n.id))
      const group    = [loc, ...neighbors]
      const scores   = group.map(l => calcScore(l.id, events, usersMap))
      const total    = scores.reduce((a, b) => a + b, 0)

      // Centroide ponderado pelo score
      const weightedLat = group.reduce((a, l, i) => a + l.lat * (scores[i] || 0.1), 0) / (total || group.length)
      const weightedLng = group.reduce((a, l, i) => a + l.lng * (scores[i] || 0.1), 0) / (total || group.length)

      const allEvtCount = group.reduce((a, l) =>
        a + events.filter(e => e.locationId === l.id).length, 0)

      clusters.push({
        id:        `cluster_${loc.id}`,
        lat:       weightedLat, lng: weightedLng,
        locations: group,
        totalScore: total,
        heat:      getHeatLevel(total),
        count:     allEvtCount,
        isCluster: true,
      })
    }
  })

  return clusters
}
