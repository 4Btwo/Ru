// ── MAPVIEW 3.0 — URBYN NEON MAP ─────────────────────────────────────────────
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
  const userMarker = useRef(null)
  const [zoom, setZoom] = useState(14)

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, z = 15) =>
      mapInst.current?.flyTo([lat, lng], z, { animate: true, duration: 0.9 }),
  }))

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInst.current) return

    mapInst.current = L.map(mapRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 4,
    }).addTo(mapInst.current)

    // User location marker — glowing cyan dot
    const uIcon = L.divIcon({
      html: `
        <div style="position:relative;width:20px;height:20px;">
          <div style="
            position:absolute;inset:-10px;border-radius:50%;
            border:1.5px solid rgba(0,245,160,0.35);
            animation:markerPulse 2.2s ease-in-out infinite;
          "></div>
          <div style="
            position:absolute;inset:-5px;border-radius:50%;
            border:1.5px solid rgba(0,245,160,0.2);
            animation:markerPulse 2.2s ease-in-out infinite 0.4s;
          "></div>
          <div style="
            width:20px;height:20px;border-radius:50%;
            background:radial-gradient(circle at 35% 35%,#00f5a0,#00c87a);
            border:3px solid rgba(255,255,255,0.9);
            box-shadow:0 0 0 0 rgba(0,245,160,0.6);
            animation:rippleCyber 2s ease-out infinite;
          "></div>
        </div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    userMarker.current = L.marker([DEFAULT_LAT, DEFAULT_LNG], { icon: uIcon, zIndexOffset: 1000 })
      .addTo(mapInst.current)

    mapInst.current.on('zoomend', () => {
      const z = mapInst.current.getZoom()
      setZoom(z)
      const el = mapInst.current.getContainer()
      el.className = el.className.replace(/\bleaflet-zoom-\d+\b/g, '')
      el.classList.add(`leaflet-zoom-${Math.round(z)}`)
    })
  }, [])

  // ── Pick mode ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return
    const map = mapInst.current
    const container = map.getContainer()

    if (pickMode) {
      container.style.cursor = 'crosshair'

      const handler = (e) => {
        const { lat, lng } = e.latlng
        if (pickMarker.current) pickMarker.current.remove()

        const icon = L.divIcon({
          html: `
            <div style="position:relative;width:28px;height:28px;">
              <div style="position:absolute;inset:-8px;border-radius:50%;
                border:2px solid rgba(79,142,255,0.5);
                animation:markerPulse 1.2s ease infinite;"></div>
              <div style="width:28px;height:28px;border-radius:50%;
                background:radial-gradient(circle at 35% 35%,#6aabff,#4f8eff);
                border:3px solid #fff;
                box-shadow:0 0 20px rgba(79,142,255,0.8);
                display:flex;align-items:center;justify-content:center;
                font-size:13px;">📍</div>
            </div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
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

  // ── Render markers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return

    const filtered = (allPlaces || []).filter(
      l => !filteredIds || filteredIds.includes(l.id)
    )
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
          if (pickMode) return
          if (cluster.isCluster && cluster.locations.length > 1) {
            mapInst.current.flyTo([cluster.lat, cluster.lng],
              Math.min(zoom + 2, 16), { animate: true, duration: 0.8 })
          } else {
            onLocationClick(cluster.locations[0])
          }
        })

      markersRef.current[cluster.id] = m
    })
  }, [allPlaces, events, usersMap, filteredIds, zoom, pickMode])

  // ── Center on user ────────────────────────────────────────────────────────
  useEffect(() => {
    if (userPos && mapInst.current) {
      mapInst.current.setView([userPos.lat, userPos.lng], 14, { animate: true })
      if (userMarker.current) {
        userMarker.current.setLatLng([userPos.lat, userPos.lng])
      }
    }
  }, [userPos])

  return (
    <div ref={mapRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
  )
})

export default MapView

// ── Cluster icon — neon glow sphere ──────────────────────────────────────────
function buildClusterIcon(cluster) {
  const heatColors = {
    hot:      { main: '#ff4757', glow: 'rgba(255,71,87,0.6)',      ring: 'rgba(255,71,87,0.3)' },
    mid:      { main: '#4f8eff', glow: 'rgba(79,142,255,0.55)',    ring: 'rgba(79,142,255,0.25)' },
    low:      { main: '#7c5cfc', glow: 'rgba(124,92,252,0.45)',    ring: 'rgba(124,92,252,0.2)' },
    inactive: { main: '#2a2a42', glow: 'rgba(42,42,66,0.3)',       ring: 'rgba(255,255,255,0.06)' },
  }

  const c = heatColors[cluster.heat] || heatColors.low
  const size = Math.min(60, 30 + cluster.totalScore * 2.2)
  const isHot = cluster.heat === 'hot'

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${isHot ? `
          <div style="position:absolute;inset:-10px;border-radius:50%;
            border:1.5px solid ${c.ring};
            animation:markerPulse 1.8s ease-in-out infinite 0.2s;"></div>
          <div style="position:absolute;inset:-5px;border-radius:50%;
            border:1px solid ${c.ring};
            animation:markerPulse 1.8s ease-in-out infinite 0.6s;"></div>
        ` : `
          <div style="position:absolute;inset:-6px;border-radius:50%;
            border:1px solid ${c.ring};
            animation:markerPulse 2.5s ease-in-out infinite;"></div>
        `}
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:radial-gradient(circle at 35% 30%, ${c.main}ee, ${c.main}88);
          box-shadow:0 0 ${isHot ? 24 : 16}px ${c.glow}, 0 0 ${isHot ? 40 : 24}px ${c.glow}40;
          border:1.5px solid rgba(255,255,255,0.18);
          display:flex;align-items:center;justify-content:center;
          flex-direction:column;cursor:pointer;
          backdrop-filter:blur(4px);
        ">
          <div style="font-size:12px;font-weight:800;color:#fff;
            font-family:'Space Mono',monospace;line-height:1;">${cluster.locations.length}</div>
          <div style="font-size:8px;color:rgba(255,255,255,0.65);line-height:1;margin-top:1px;">locais</div>
        </div>
        <div style="
          position:absolute;top:-7px;right:-7px;
          background:#f0f0ff;color:#08080e;
          font-size:9px;font-weight:800;
          font-family:'Space Mono',monospace;
          border-radius:20px;padding:2px 6px;
          min-width:18px;text-align:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
        ">${cluster.count}</div>
      </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
