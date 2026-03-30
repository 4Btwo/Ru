// ── MARCADORES DO MAPA — ícone por categoria + tipo dominante ─────────────────
import L from 'leaflet'
import { calcScore, getHeatLevel, getLocationStatus } from './hotspot'
import { getFomoLabel, CAT_ICON } from './constants'

function markerSize(score) {
  return Math.min(60, 28 + score * 3.5)
}

export function buildMarkerIcon(loc, events, usersMap = {}) {
  const status = getLocationStatus(loc.id, events, usersMap)
  const { heat, domType, color, emoji, score } = status
  const size   = heat === 'inactive' ? 26 : markerSize(score)
  const count  = events.filter(e => e.locationId === loc.id).length

  const glowHex = heat === 'inactive' ? 'transparent' : `${color}88`

  // Anel pulsante só para locais ativos com tipo positivo
  const shouldPulse = (heat === 'hot' || heat === 'mid') && domType !== 'morto'

  const ring = shouldPulse ? `
    <div style="position:absolute;inset:-8px;border-radius:50%;
      border:2px solid ${color};opacity:.5;
      animation:markerPulse 1.6s ease infinite;"></div>
    <div style="position:absolute;inset:-16px;border-radius:50%;
      border:1px solid ${color};opacity:.2;
      animation:markerPulse 1.6s ease infinite .4s;"></div>` : ''

  // FOMO label só para tipos positivos
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

  // ── Ícone exibido no marcador ─────────────────────────────────────────────
  // Inativo → ícone da categoria do local (ex: 🍺 para noturno, 🚦 para trânsito)
  // Ativo   → emoji do tipo dominante (ex: 🍻 lotado, 💥 acidente)
  const displayEmoji = heat === 'inactive'
    ? (CAT_ICON[loc.cat] || CAT_ICON.default)
    : emoji

  // Fundo do marcador
  // Inativo → superfície escura discreta com borda sutil
  // Ativo   → cor do tipo dominante com glow
  const bgInactive = `background:#1a1a26;border:1.5px solid #3a3a5a;`
  const bgActive   = `background:radial-gradient(circle,${color}ee,${color}77);
                      box-shadow:0 0 ${heat === 'hot' ? 24 : 12}px ${glowHex};
                      border:2px solid rgba(255,255,255,.15);`

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;">
        ${ring}
        ${fomoLabel}
        <div style="
          width:${size}px;height:${size}px;border-radius:50%;
          ${heat === 'inactive' ? bgInactive : bgActive}
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.round(size * .42)}px;cursor:pointer;
        ">${displayEmoji}</div>
        ${badge}
      </div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
