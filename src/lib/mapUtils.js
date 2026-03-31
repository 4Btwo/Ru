// ── MARCADORES DO MAPA — ícone próprio por categoria + tipo dominante ──────────
import L from 'leaflet'
import { calcScore, getHeatLevel, getLocationStatus } from './hotspot'
import { getFomoLabel } from './constants'

function markerSize(score) {
  return Math.min(60, 28 + score * 3.5)
}

// Ícone base por categoria do local (quando inativo)
function getCatIcon(cat) {
  switch (cat) {
    case 'noturno':  return '🍺'
    case 'transito': return '🚦'
    case 'parque':   return '🌳'
    case 'comercio': return '🛒'
    case 'show':     return '🎵'
    default:         return '📍'
  }
}

// Cor base por categoria (quando inativo)
function getCatColor(cat) {
  switch (cat) {
    case 'noturno':  return '#7c3aed'
    case 'transito': return '#0369a1'
    case 'parque':   return '#16a34a'
    case 'comercio': return '#b45309'
    case 'show':     return '#be185d'
    default:         return '#3a3a5a'
  }
}

export function buildMarkerIcon(loc, events, usersMap = {}) {
  const status = getLocationStatus(loc.id, events, usersMap)
  const { heat, domType, color, emoji, score } = status
  const size   = heat === 'inactive' ? 32 : markerSize(score)
  const count  = events.filter(e => e.locationId === loc.id).length

  // Quando inativo: usa ícone e cor da categoria
  const isInactive = heat === 'inactive'
  const displayEmoji = isInactive ? getCatIcon(loc.cat) : emoji
  const bgColor      = isInactive ? getCatColor(loc.cat) : color
  const glowHex      = isInactive ? 'transparent' : `${color}88`

  // Anel pulsante só para locais quentes com tipo positivo
  const shouldPulse = (heat === 'hot' || heat === 'mid') && domType !== 'morto'

  const ring = shouldPulse ? `
    <div style="position:absolute;inset:-8px;border-radius:50%;
      border:2px solid ${color};opacity:.5;
      animation:markerPulse 1.6s ease infinite;"></div>
    <div style="position:absolute;inset:-16px;border-radius:50%;
      border:1px solid ${color};opacity:.2;
      animation:markerPulse 1.6s ease infinite .4s;"></div>` : ''

  // Label FOMO
  const showFomo = (heat === 'hot' || heat === 'mid') && domType !== 'morto'
  const fomoLabel = showFomo
    ? `<div style="position:absolute;bottom:calc(100% + 6px);left:50%;
        transform:translateX(-50%);
        background:${color};color:#fff;
        font-size:9px;font-weight:800;font-family:'Syne',sans-serif;
        padding:3px 8px;border-radius:20px;white-space:nowrap;
        box-shadow:0 2px 8px rgba(0,0,0,.4);letter-spacing:.03em;
        pointer-events:none;">
        ${status.label}
      </div>` : ''

  // Badge de contagem
  const badge = count > 0
    ? `<div style="position:absolute;top:-7px;right:-7px;background:#f0f0ff;color:#0a0a0f;
        font-size:9px;font-weight:800;font-family:'Space Mono',monospace;
        border-radius:20px;padding:1px 6px;min-width:17px;text-align:center;
        box-shadow:0 1px 4px rgba(0,0,0,.4);">${count}</div>` : ''

  // Forma do marcador: pin (gota) para locais inativos, círculo para ativos
  if (isInactive) {
    // Pin em forma de local com ícone da categoria
    const pinSize = size
    return L.divIcon({
      html: `
        <div style="position:relative;width:${pinSize}px;height:${pinSize + 8}px;">
          ${fomoLabel}
          <div style="
            width:${pinSize}px;height:${pinSize}px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:radial-gradient(circle,${bgColor}dd,${bgColor}99);
            border:2px solid rgba(255,255,255,.25);
            box-shadow:0 4px 12px rgba(0,0,0,.4);
            display:flex;align-items:center;justify-content:center;cursor:pointer;
          ">
            <span style="transform:rotate(45deg);font-size:${Math.round(pinSize * .42)}px;">${displayEmoji}</span>
          </div>
          ${badge}
        </div>`,
      className: '',
      iconSize:   [pinSize, pinSize + 8],
      iconAnchor: [pinSize / 2, pinSize + 8],
    })
  }

  // Círculo pulsante quando ativo
  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${ring}
        ${fomoLabel}
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:radial-gradient(circle,${bgColor}ee,${bgColor}77);
          box-shadow:0 0 ${heat==='hot'?24:12}px ${glowHex};
          border:2px solid rgba(255,255,255,.2);
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.round(size*.42)}px;cursor:pointer;
        ">${displayEmoji}</div>
        ${badge}
      </div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
