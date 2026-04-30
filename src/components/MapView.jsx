// ── MAPA COM MODO DE SELEÇÃO DE PONTO ────────────────────────────────────────
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import L from 'leaflet'
import { DEFAULT_LAT, DEFAULT_LNG } from '../lib/constants'
import { buildMarkerIcon } from '../lib/mapUtils'
import { clusterLocations } from '../lib/cluster'

const MapView = forwardRef(function MapView(
  { allPlaces, events, usersMap, filteredIds, onLocationClick, userPos, pickMode, onPick },
  ref
) {
  const mapRef     = useRef(null)
  const mapInst    = useRef(null)
  const markersRef = useRef({})
  const pickMarker = useRef(null)
  const [zoom, setZoom] = useState(14)

  // Expõe flyTo para o App
  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, z = 15) => mapInst.current?.flyTo([lat, lng], z, { animate:true, duration:.8 }),
  }))

  // Init mapa
  useEffect(() => {
    if (mapInst.current) return
    mapInst.current = L.map(mapRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG], zoom:14, zoomControl:false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 })
      .addTo(mapInst.current)

    // Marcador do usuário
    const uIcon = L.divIcon({
      html:`<div style="width:14px;height:14px;background:#1db954;border-radius:50%;border:3px solid #fff;box-shadow:0 0 14px #1db954"></div>`,
      className:'', iconSize:[14,14], iconAnchor:[7,7],
    })
    L.marker([DEFAULT_LAT, DEFAULT_LNG], { icon: uIcon })
      .addTo(mapInst.current)
      .bindTooltip('Você', { permanent:false, direction:'top' })

    mapInst.current.on('zoomend', () => {
      const z = mapInst.current.getZoom()
      setZoom(z)
      // Atualiza classe de zoom no container para CSS de nome do marcador
      const el = mapInst.current.getContainer()
      el.className = el.className.replace(/\bleaflet-zoom-\d+\b/g, '')
      el.classList.add(`leaflet-zoom-${Math.round(z)}`)
    })
  }, [])

  // Modo seleção de ponto — cursor muda + clique coloca marcador temporário
  useEffect(() => {
    if (!mapInst.current) return
    const map = mapInst.current
    const container = map.getContainer()

    if (pickMode) {
      container.style.cursor = 'crosshair'
      const handler = (e) => {
        const { lat, lng } = e.latlng

        // Remove marcador anterior
        if (pickMarker.current) pickMarker.current.remove()

        // Marcador temporário pulsante
        const icon = L.divIcon({
          html:`<div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #ff2d55;opacity:.5;animation:markerPulse 1.2s ease infinite;"></div>
            <div style="width:24px;height:24px;border-radius:50%;background:#ff2d55;border:3px solid #fff;box-shadow:0 0 16px rgba(255,45,85,.7);display:flex;align-items:center;justify-content:center;font-size:12px;">📍</div>
          </div>`,
          className:'', iconSize:[24,24], iconAnchor:[12,12],
        })
        pickMarker.current = L.marker([lat, lng], { icon }).addTo(map)
        onPick({ lat, lng })
      }
      map.on('click', handler)
      return () => {
        map.off('click', handler)
        container.style.cursor = ''
        if (pickMarker.current) { pickMarker.current.remove(); pickMarker.current = null }
      }
    } else {
      container.style.cursor = ''
      if (pickMarker.current) { pickMarker.current.remove(); pickMarker.current = null }
    }
  }, [pickMode, onPick])

  // Atualiza markers quando eventos ou lugares mudam
  useEffect(() => {
    if (!mapInst.current) return
    const filtered = (allPlaces || []).filter(l => !filteredIds || filteredIds.includes(l.id))
    const clusters = clusterLocations(filtered, events, usersMap, zoom)

    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}

    clusters.forEach(cluster => {
      if (!cluster.locations?.length) return
      const icon = cluster.isCluster
        ? buildClusterIcon(cluster)
        : buildMarkerIcon(cluster.locations[0], events, usersMap)

      const m = L.marker([cluster.lat, cluster.lng], { icon })
        .addTo(mapInst.current)
        .on('click', () => {
          if (pickMode) return  // em modo pick, não abre detail
          if (cluster.isCluster && cluster.locations.length > 1) {
            mapInst.current.flyTo([cluster.lat, cluster.lng],
              Math.min(zoom + 2, 16), { animate:true, duration:.8 })
          } else {
            onLocationClick(cluster.locations[0])
          }
        })
      markersRef.current[cluster.id] = m
    })
  }, [allPlaces, events, usersMap, filteredIds, zoom, pickMode])

  // Centraliza no usuário
  useEffect(() => {
    if (userPos && mapInst.current)
      mapInst.current.setView([userPos.lat, userPos.lng], 14, { animate:true })
  }, [userPos])

  return <div ref={mapRef} style={{ position:'absolute', inset:0, zIndex:1 }} />
})

export default MapView

function buildClusterIcon(cluster) {
  const colors = { hot:'#ff2d55', mid:'#ffcc00', low:'#6666aa', inactive:'#3a3a5a' }
  const color  = colors[cluster.heat] || '#6666aa'
  const size   = Math.min(56, 32 + cluster.totalScore * 2)

  return L.divIcon({
    html:`
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:.4;animation:markerPulse 1.8s ease infinite;"></div>
        <div style="width:${size}px;height:${size}px;border-radius:50%;
          background:radial-gradient(circle,${color}cc,${color}66);
          box-shadow:0 0 18px ${color}88;border:2px solid rgba(255,255,255,.2);
          display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer;">
          <div style="font-size:11px;font-weight:800;color:#fff;font-family:'Space Mono',monospace;">${cluster.locations.length}</div>
          <div style="font-size:8px;color:rgba(255,255,255,.7);">locais</div>
        </div>
        <div style="position:absolute;top:-7px;right:-7px;background:#f0f0ff;color:#0a0a0f;
          font-size:9px;font-weight:800;font-family:'Space Mono',monospace;
          border-radius:20px;padding:1px 6px;min-width:17px;text-align:center;">
          ${cluster.count}
        </div>
      </div>`,
    className:'', iconSize:[size,size], iconAnchor:[size/2,size/2],
  })
}
