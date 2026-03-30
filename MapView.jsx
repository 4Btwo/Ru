import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { SEED_LOCATIONS } from '../lib/constants'
import { calcScore, buildMarkerIcon } from '../lib/mapUtils'

export default function MapView({ events, filteredIds, onLocationClick, userPos }) {
  const mapRef     = useRef(null)
  const mapInst    = useRef(null)
  const markersRef = useRef({})

  useEffect(() => {
    if (mapInst.current) return
    mapInst.current = L.map(mapRef.current, {
      center: [-22.3148, -49.0631],
      zoom:   14,
      zoomControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(mapInst.current)

    SEED_LOCATIONS.forEach(loc => {
      const m = L.marker([loc.lat, loc.lng], { icon: buildMarkerIcon(0) })
        .addTo(mapInst.current)
        .on('click', () => onLocationClick(loc))
      markersRef.current[loc.id] = m
    })
  }, [])

  // Atualiza ícones quando eventos mudam
  useEffect(() => {
    SEED_LOCATIONS.forEach(loc => {
      const score = calcScore(loc.id, events)
      markersRef.current[loc.id]?.setIcon(buildMarkerIcon(score))
    })
  }, [events])

  // Aplica filtro de visibilidade
  useEffect(() => {
    if (!filteredIds) return
    SEED_LOCATIONS.forEach(loc => {
      const m = markersRef.current[loc.id]
      if (!m) return
      if (filteredIds.includes(loc.id)) {
        m.addTo(mapInst.current)
      } else {
        m.remove()
      }
    })
  }, [filteredIds])

  // Voa para posição do usuário
  useEffect(() => {
    if (userPos && mapInst.current) {
      mapInst.current.setView([userPos.lat, userPos.lng], 14, { animate: true })
    }
  }, [userPos])

  return <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
}
