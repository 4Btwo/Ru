// ── GERAÇÃO DE IMAGEM PARA SHARE — Bloco 4.1 ─────────────────────────────────
// Usa Canvas API para gerar uma imagem visual do hotspot
// Compatível com Web Share API (shareFiles) e download direto

import { getHeatLevel } from './hotspot'
import { getFomoLabel, EVENT_META } from './constants'

const HEAT_COLOR = { hot:'#ff2d55', mid:'#ffcc00', low:'#6666aa', inactive:'#6666aa' }

/**
 * Gera um canvas com card visual do hotspot e retorna como Blob
 */
export async function generateShareImage(location, score, actEvts) {
  const canvas  = document.createElement('canvas')
  canvas.width  = 1080
  canvas.height = 1080
  const ctx     = canvas.getContext('2d')

  const heat    = getHeatLevel(score)
  const color   = HEAT_COLOR[heat]
  const fomo    = heat !== 'inactive' ? getFomoLabel(heat, location.cat) : 'SEM ATIVIDADE'
  const topTypes = [...new Set(actEvts.slice(0,3).map(e => e.type))]
  const emojis   = topTypes.map(t => EVENT_META[t]?.emoji || '').join('  ')

  // ── BACKGROUND ───────────────────────────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(540, 540, 0, 540, 540, 800)
  bgGrad.addColorStop(0, '#12121a')
  bgGrad.addColorStop(1, '#0a0a0f')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, 1080, 1080)

  // ── GLOW CIRCLE ──────────────────────────────────────────────────────────
  const glowGrad = ctx.createRadialGradient(540, 480, 0, 540, 480, 360)
  glowGrad.addColorStop(0, `${color}33`)
  glowGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, 1080, 1080)

  // ── DOT PULSANTE (representação) ─────────────────────────────────────────
  ctx.beginPath()
  ctx.arc(540, 420, 90, 0, Math.PI * 2)
  ctx.fillStyle = `${color}22`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(540, 420, 60, 0, Math.PI * 2)
  ctx.fillStyle = `${color}55`
  ctx.fill()

  ctx.beginPath()
  ctx.arc(540, 420, 36, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  // ── FOMO LABEL ───────────────────────────────────────────────────────────
  ctx.font = 'bold 52px sans-serif'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.fillText(fomo, 540, 560)

  // ── EMOJIS ───────────────────────────────────────────────────────────────
  if (emojis) {
    ctx.font = '72px serif'
    ctx.fillText(emojis, 540, 650)
  }

  // ── NOME DO LOCAL ─────────────────────────────────────────────────────────
  ctx.font = 'bold 56px sans-serif'
  ctx.fillStyle = '#f0f0ff'
  ctx.fillText(location.name, 540, 740)

  // ── CONTAGEM ─────────────────────────────────────────────────────────────
  if (actEvts.length > 0) {
    ctx.font = '36px sans-serif'
    ctx.fillStyle = '#6666aa'
    ctx.fillText(`${actEvts.length} reporte${actEvts.length > 1 ? 's' : ''} agora`, 540, 800)
  }

  // ── DIVISOR ──────────────────────────────────────────────────────────────
  ctx.strokeStyle = '#2a2a3d'
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(200, 860); ctx.lineTo(880, 860)
  ctx.stroke()

  // ── BRANDING ─────────────────────────────────────────────────────────────
  // Dot vermelho
  ctx.beginPath()
  ctx.arc(420, 920, 10, 0, Math.PI * 2)
  ctx.fillStyle = '#ff2d55'
  ctx.fill()

  ctx.font = 'bold 36px sans-serif'
  ctx.fillStyle = '#f0f0ff'
  ctx.textAlign = 'left'
  ctx.fillText('RADAR URBANO', 445, 932)

  ctx.font = '28px sans-serif'
  ctx.fillStyle = '#6666aa'
  ctx.textAlign = 'right'
  ctx.fillText('ao vivo agora', 860, 932)

  // Converte canvas → Blob
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

/**
 * Share com imagem via Web Share API
 * Fallback: download da imagem
 */
export async function shareWithImage(location, score, actEvts) {
  try {
    const blob = await generateShareImage(location, score, actEvts)
    const file = new File([blob], 'radar-urbano.png', { type: 'image/png' })

    // Web Share API com arquivo (Chrome/Safari mobile)
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: `Radar Urbano — ${location.name}`,
        files: [file],
      })
      return 'shared'
    }

    // Fallback: abre a imagem para salvar/compartilhar
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href  = url
    link.download = `radar-urbano-${location.id}.png`
    link.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  } catch (e) {
    if (e.name === 'AbortError') return 'cancelled'
    console.warn('[SHARE IMAGE]', e)
    return 'error'
  }
}
