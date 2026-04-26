// ── MARCADORES DO MAPA — ícones SVG contextuais ───────────────────────────────
import L from 'leaflet'
import { calcScore, getHeatLevel, getLocationStatus } from './hotspot'

// Arredonda coordenadas SVG para evitar floats longos que quebram o atributo 'd'
const r = (n) => Math.round(n * 100) / 100


function markerSize(score) {
  return Math.min(60, 28 + score * 3.5)
}

// ── SVG por tipo de reporte dominante (ativo) ──────────────────────────────────
function buildActiveSvg(type, color, size) {
  const s = size
  const half = Math.round(s / 2)

  const svgs = {
    cheio: `
      <svg width="${s}" height="${s}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}dd" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
        <!-- copo de cerveja -->
        <rect x="12" y="14" width="11" height="14" rx="2" fill="#fff" opacity=".9"/>
        <rect x="23" y="17" width="5" height="8" rx="2.5" fill="#fff" opacity=".7"/>
        <rect x="12" y="14" width="11" height="4" rx="1" fill="#ffdd88" opacity=".8"/>
      </svg>`,

    evento: `
      <svg width="${s}" height="${s}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}dd" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
        <!-- confete / estrelas -->
        <circle cx="14" cy="14" r="2.5" fill="#fff" opacity=".9"/>
        <circle cx="26" cy="13" r="2"   fill="#ffdd00" opacity=".9"/>
        <circle cx="28" cy="24" r="2.5" fill="#fff" opacity=".8"/>
        <circle cx="13" cy="25" r="2"   fill="#ffdd00" opacity=".8"/>
        <!-- triângulo festa -->
        <path d="M20 10 L28 28 L12 28 Z" fill="rgba(255,255,255,.25)" stroke="#fff" stroke-width="1.2"/>
      </svg>`,

    morto: `
      <svg width="${s}" height="${s}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}99" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
        <!-- zzz -->
        <text x="12" y="18" font-size="7" fill="rgba(255,255,255,.7)" font-family="sans-serif" font-weight="bold">z</text>
        <text x="17" y="23" font-size="9" fill="rgba(255,255,255,.6)" font-family="sans-serif" font-weight="bold">z</text>
        <text x="23" y="19" font-size="11" fill="rgba(255,255,255,.5)" font-family="sans-serif" font-weight="bold">z</text>
      </svg>`,

    pesado: `
      <svg width="${s}" height="${s}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}dd" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
        <!-- carro simplificado -->
        <rect x="9" y="19" width="22" height="9" rx="3" fill="#fff" opacity=".9"/>
        <path d="M13 19 L15 13 L25 13 L27 19Z" fill="#fff" opacity=".75"/>
        <circle cx="14" cy="28" r="2.5" fill="${color}" stroke="#fff" stroke-width="1.2"/>
        <circle cx="26" cy="28" r="2.5" fill="${color}" stroke="#fff" stroke-width="1.2"/>
      </svg>`,

    bloqueio: `
      <svg width="${s}" height="${s}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}dd" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
        <!-- cone de obras -->
        <path d="M20 10 L28 30 L12 30 Z" fill="rgba(255,255,255,.85)"/>
        <rect x="12" y="17" width="16" height="3" fill="${color}"/>
        <rect x="14" y="23" width="12" height="3" fill="${color}"/>
        <rect x="11" y="29" width="18" height="2.5" rx="1" fill="rgba(255,255,255,.6)"/>
      </svg>`,

    acidente: `
      <svg width="${s}" height="${s}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <!-- triângulo de perigo -->
        <path d="M20 4 L36 32 L4 32 Z" fill="${color}ee" stroke="rgba(255,255,255,.4)" stroke-width="1.5" stroke-linejoin="round"/>
        <!-- ! -->
        <rect x="18.5" y="14" width="3" height="10" rx="1.5" fill="#fff"/>
        <circle cx="20" cy="28" r="2" fill="#fff"/>
      </svg>`,

    blitz: `
      <svg width="${s}" height="${s}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <!-- viatura — shape retangular arredondado -->
        <rect x="4" y="12" width="32" height="18" rx="5" fill="${color}dd" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>
        <!-- sirene -->
        <rect x="12" y="8" width="6" height="5" rx="2" fill="#ff3333" opacity=".9"/>
        <rect x="22" y="8" width="6" height="5" rx="2" fill="#3399ff" opacity=".9"/>
        <!-- janela -->
        <rect x="10" y="16" width="20" height="7" rx="2" fill="rgba(180,220,255,.4)" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
        <!-- rodas -->
        <circle cx="12" cy="30" r="3" fill="#1a1a26" stroke="#fff" stroke-width="1.2"/>
        <circle cx="28" cy="30" r="3" fill="#1a1a26" stroke="#fff" stroke-width="1.2"/>
      </svg>`,
  }
  return svgs[type] || null
}

// ── SVG por categoria do local (inativo — pin gota) ────────────────────────────
function buildInactiveSvg(cat, size) {
  const s  = size
  const h  = s + 10
  const colors = {
    noturno:         { bg:'#7c3aed', stroke:'#a78bfa' },
    transito:        { bg:'#0369a1', stroke:'#38bdf8' },
    estabelecimento: { bg:'#92400e', stroke:'#fbbf24' },
    parque:          { bg:'#15803d', stroke:'#4ade80' },
    comercio:        { bg:'#92400e', stroke:'#fbbf24' },
    show:            { bg:'#9d174d', stroke:'#f472b6' },
  }
  const { bg, stroke } = colors[cat] || { bg:'#3a3a5a', stroke:'#6666aa' }

  const icons = {
    noturno: `
      <!-- lua -->
      <path d="M${r(s*.55)} ${r(s*.25)} A${r(s*.22)} ${r(s*.22)} 0 1 1 ${r(s*.55)} ${r(s*.75)} A${r(s*.15)} ${r(s*.15)} 0 0 0 ${r(s*.55)} ${r(s*.25)}Z" fill="#fff" opacity=".9"/>
      <circle cx="${r(s*.52)}" cy="${r(s*.48)}" r="${r(s*.07)}" fill="#fff" opacity=".5"/>`,

    transito: `
      <!-- semáforo -->
      <rect x="${r(s*.33)}" y="${r(s*.2)}" width="${r(s*.34)}" height="${r(s*.55)}" rx="${r(s*.06)}" fill="rgba(0,0,0,.4)"/>
      <circle cx="${r(s*.5)}" cy="${r(s*.3)}" r="${r(s*.07)}" fill="#ff4444"/>
      <circle cx="${r(s*.5)}" cy="${r(s*.48)}" r="${r(s*.07)}" fill="#ffcc00"/>
      <circle cx="${r(s*.5)}" cy="${r(s*.66)}" r="${r(s*.07)}" fill="#44ff44"/>`,

    estabelecimento: `
      <!-- lojinha -->
      <rect x="${r(s*.2)}" y="${r(s*.35)}" width="${r(s*.6)}" height="${r(s*.38)}" rx="${r(s*.04)}" fill="rgba(255,255,255,.85)"/>
      <path d="${r(s*.2)} ${r(s*.35)} L${r(s*.5)} ${r(s*.18)} L${r(s*.8)} ${r(s*.35)}Z" fill="rgba(255,255,255,.6)"/>
      <rect x="${r(s*.42)}" y="${r(s*.5)}" width="${r(s*.16)}" height="${r(s*.23)}" rx="${r(s*.03)}" fill="${bg}"/>`,

    parque: `
      <!-- árvore -->
      <ellipse cx="${r(s*.5)}" cy="${r(s*.35)}" rx="${r(s*.18)}" ry="${r(s*.2)}" fill="rgba(255,255,255,.85)"/>
      <rect x="${r(s*.46)}" y="${r(s*.52)}" width="${r(s*.08)}" height="${r(s*.2)}" rx="${r(s*.03)}" fill="rgba(255,255,255,.7)"/>`,

    show: `
      <!-- nota musical -->
      <text x="${r(s*.28)}" y="${r(s*.68)}" font-size="${r(s*.42)}" fill="rgba(255,255,255,.9)" font-family="sans-serif">♪</text>`,
  }

  const inner = icons[cat] || `<circle cx="${r(s/2)}" cy="${r(s/2)}" r="${r(s*.18)}" fill="rgba(255,255,255,.8)"/>`

  return `
    <svg width="${r(s)}" height="${h}" viewBox="0 0 ${r(s)} ${h}" xmlns="http://www.w3.org/2000/svg">
      <!-- sombra -->
      <ellipse cx="${r(s/2)}" cy="${h-3}" rx="${r(s*.28)}" ry="${r(s*.1)}" fill="rgba(0,0,0,.25)"/>
      <!-- corpo do pin -->
      <path d="M${r(s/2)} ${h-5}
               C${r(s/2)} ${h-5} ${r(s*.1)} ${r(s*.65)} ${r(s*.1)} ${r(s*.42)}
               A${r(s*.4)} ${r(s*.4)} 0 1 1 ${r(s*.9)} ${r(s*.42)}
               C${r(s*.9)} ${r(s*.65)} ${r(s/2)} ${h-5} ${r(s/2)} ${h-5}Z"
            fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
      <!-- ícone interno -->
      ${inner}
    </svg>`
}

export function buildMarkerIcon(loc, events, usersMap = {}) {
  const status     = getLocationStatus(loc.id, events, usersMap)
  const { heat, domType, color, score } = status
  const size       = heat === 'inactive' ? 34 : markerSize(score)
  const count      = events.filter(e => e.locationId === loc.id).length
  const isInactive = heat === 'inactive'

  // Badge
  const badge = count > 0
    ? `<div style="position:absolute;top:-7px;right:-7px;background:#f0f0ff;color:#0a0a0f;
        font-size:9px;font-weight:800;font-family:'Space Mono',monospace;
        border-radius:20px;padding:1px 6px;min-width:17px;text-align:center;
        box-shadow:0 1px 4px rgba(0,0,0,.4);">${count}</div>` : ''

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

  // Anel pulsante
  const shouldPulse = (heat === 'hot' || heat === 'mid') && domType !== 'morto'
  const ring = shouldPulse ? `
    <div style="position:absolute;inset:-8px;border-radius:50%;
      border:2px solid ${color};opacity:.5;
      animation:markerPulse 1.6s ease infinite;"></div>
    <div style="position:absolute;inset:-16px;border-radius:50%;
      border:1px solid ${color};opacity:.2;
      animation:markerPulse 1.6s ease infinite .4s;"></div>` : ''

  // ── INATIVO: pin gota SVG por categoria ──────────────────────────────────────
  if (isInactive) {
    const pinH  = size + 10
    const svgPin = buildInactiveSvg(loc.cat, size)
    return L.divIcon({
      html: `<div style="position:relative;width:${size}px;height:${pinH}px;">
        ${fomoLabel}
        ${svgPin}
        ${badge}
      </div>`,
      className: '',
      iconSize:   [size, pinH],
      iconAnchor: [size / 2, pinH - 3],
    })
  }

  // ── ATIVO: ícone SVG contextual por tipo de reporte ───────────────────────────
  const svgIcon = buildActiveSvg(domType, color, size)
  const isTriangle = domType === 'acidente'

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${ring}
      ${fomoLabel}
      <div style="
        width:${size}px;height:${size}px;
        filter:drop-shadow(0 0 ${heat==='hot'?10:5}px ${color}99);
        cursor:pointer;
      ">${svgIcon || `<svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="18" fill="${color}dd"/></svg>`}</div>
      ${badge}
    </div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, isTriangle ? size : size / 2],
  })
}
