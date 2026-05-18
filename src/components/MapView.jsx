import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import L from 'leaflet'
import { DEFAULT_LAT, DEFAULT_LNG } from '../lib/constants'
import { buildMarkerIcon } from '../lib/mapUtils'
import { clusterLocations } from '../lib/cluster'

const MapView = forwardRef(function MapView({ allPlaces, events, usersMap, filteredIds, onLocationClick, userPos, pickMode, onPick }, ref) {
  const mapRef     = useRef(null)
  const mapInst    = useRef(null)
  const markersRef = useRef({})
  const pickMarker = useRef(null)
  const userMarker = useRef(null)
  const [zoom, setZoom] = useState(14)

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, z=15) => mapInst.current?.flyTo([lat,lng], z, {animate:true, duration:0.9}),
  }))

  useEffect(() => {
    if (mapInst.current) return
    mapInst.current = L.map(mapRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG], zoom: 14,
      zoomControl: false, attributionControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, keepBuffer:4 }).addTo(mapInst.current)

    // Glowing user marker
    const uIcon = L.divIcon({
      html: `<div style="position:relative;width:22px;height:22px;">
        <div style="position:absolute;inset:-12px;border-radius:50%;border:1.5px solid rgba(0,245,160,0.3);animation:markerPulse 2.2s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(0,245,160,0.18);animation:markerPulse 2.2s ease-in-out infinite 0.5s;"></div>
        <div style="width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#00f5a0,#00c87a);border:3px solid rgba(255,255,255,0.95);box-shadow:0 0 0 0 rgba(0,245,160,0.6);animation:rippleCyber 2s ease-out infinite;"></div>
      </div>`,
      className:'', iconSize:[22,22], iconAnchor:[11,11],
    })
    userMarker.current = L.marker([DEFAULT_LAT, DEFAULT_LNG], {icon:uIcon, zIndexOffset:1000}).addTo(mapInst.current)

    mapInst.current.on('zoomend', () => {
      const z = mapInst.current.getZoom(); setZoom(z)
      const el = mapInst.current.getContainer()
      el.className = el.className.replace(/\bleaflet-zoom-\d+\b/g,'')
      el.classList.add(`leaflet-zoom-${Math.round(z)}`)
    })
  }, [])

  useEffect(() => {
    if (!mapInst.current) return
    const map = mapInst.current
    const container = map.getContainer()
    if (pickMode) {
      container.style.cursor = 'crosshair'
      const handler = e => {
        const {lat,lng} = e.latlng
        if (pickMarker.current) pickMarker.current.remove()
        const icon = L.divIcon({
          html:`<div style="position:relative;width:32px;height:32px;">
            <div style="position:absolute;inset:-10px;border-radius:50%;border:2px solid rgba(79,142,255,0.45);animation:markerPulse 1.3s ease infinite;"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6aabff,#4f8eff);border:3px solid #fff;box-shadow:0 0 24px rgba(79,142,255,0.85);display:flex;align-items:center;justify-content:center;font-size:14px;">📍</div>
          </div>`,
          className:'', iconSize:[32,32], iconAnchor:[16,16],
        })
        pickMarker.current = L.marker([lat,lng], {icon}).addTo(map)
        onPick({lat,lng})
      }
      map.on('click', handler)
      return () => { map.off('click', handler); container.style.cursor=''; if(pickMarker.current){pickMarker.current.remove();pickMarker.current=null} }
    } else {
      container.style.cursor=''
      if(pickMarker.current){pickMarker.current.remove();pickMarker.current=null}
    }
  }, [pickMode, onPick])

  useEffect(() => {
    if (!mapInst.current) return
    const filtered = (allPlaces||[]).filter(l=>!filteredIds||filteredIds.includes(l.id))
    const clusters = clusterLocations(filtered, events, usersMap, zoom)
    Object.values(markersRef.current).forEach(m=>m.remove())
    markersRef.current = {}
    clusters.forEach(cluster => {
      if (!cluster.locations?.length) return
      const icon = cluster.isCluster ? buildClusterIcon(cluster) : buildMarkerIcon(cluster.locations[0], events, usersMap)
      const m = L.marker([cluster.lat, cluster.lng], {icon})
        .addTo(mapInst.current)
        .on('click', () => {
          if (pickMode) return
          if (cluster.isCluster && cluster.locations.length > 1)
            mapInst.current.flyTo([cluster.lat,cluster.lng], Math.min(zoom+2,16), {animate:true,duration:0.8})
          else onLocationClick(cluster.locations[0])
        })
      markersRef.current[cluster.id] = m
    })
  }, [allPlaces, events, usersMap, filteredIds, zoom, pickMode])

  useEffect(() => {
    if (userPos && mapInst.current) {
      mapInst.current.setView([userPos.lat,userPos.lng], 14, {animate:true})
      userMarker.current?.setLatLng([userPos.lat,userPos.lng])
    }
  }, [userPos])

  return <div ref={mapRef} style={{position:'absolute',inset:0,zIndex:1}}/>
})
export default MapView

function buildClusterIcon(cluster) {
  const cfg = {
    hot:  {c:'#ff4757',g:'rgba(255,71,87,0.6)',    r:'rgba(255,71,87,0.28)'},
    mid:  {c:'#4f8eff',g:'rgba(79,142,255,0.55)',  r:'rgba(79,142,255,0.22)'},
    low:  {c:'#7c5cfc',g:'rgba(124,92,252,0.45)',  r:'rgba(124,92,252,0.18)'},
    inactive:{c:'#2a2a42',g:'rgba(42,42,66,0.3)', r:'rgba(255,255,255,0.05)'},
  }
  const c   = cfg[cluster.heat]||cfg.low
  const sz  = Math.min(62, 32+cluster.totalScore*2.2)
  const hot = cluster.heat==='hot'
  return L.divIcon({
    html:`<div style="position:relative;width:${sz}px;height:${sz}px;">
      ${hot
        ?`<div style="position:absolute;inset:-12px;border-radius:50%;border:1.5px solid ${c.r};animation:markerPulse 1.8s ease-in-out infinite 0.15s;"></div>
           <div style="position:absolute;inset:-6px;border-radius:50%;border:1px solid ${c.r};animation:markerPulse 1.8s ease-in-out infinite 0.55s;"></div>`
        :`<div style="position:absolute;inset:-7px;border-radius:50%;border:1px solid ${c.r};animation:markerPulse 2.6s ease-in-out infinite;"></div>`
      }
      <div style="width:${sz}px;height:${sz}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${c.c}ee,${c.c}88);box-shadow:0 0 ${hot?28:18}px ${c.g},0 0 ${hot?44:26}px ${c.g}40;border:1.5px solid rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:flex-start;flex-direction:column;justify-content:center;cursor:pointer;">
        <div style="font-size:12px;font-weight:800;color:#fff;font-family:'Space Mono',monospace;line-height:1;">${cluster.locations.length}</div>
        <div style="font-size:8px;color:rgba(255,255,255,0.6);line-height:1;margin-top:1px;">locais</div>
      </div>
      <div style="position:absolute;top:-8px;right:-8px;background:#f0f0ff;color:#08080e;font-size:9px;font-weight:800;font-family:'Space Mono',monospace;border-radius:20px;padding:2px 6px;min-width:18px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${cluster.count}</div>
    </div>`,
    className:'', iconSize:[sz,sz], iconAnchor:[sz/2,sz/2],
  })
}
