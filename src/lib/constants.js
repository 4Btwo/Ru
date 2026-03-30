export const LOCATIONS = [
  { id:'1', name:'Praça da Sé',        lat:-22.3144, lng:-49.0653, cat:'noturno'  },
  { id:'2', name:'Bar do Neto',         lat:-22.3211, lng:-49.0598, cat:'noturno'  },
  { id:'3', name:'Av. Duque de Caxias', lat:-22.3089, lng:-49.0522, cat:'transito' },
  { id:'4', name:'Balada Somar',        lat:-22.3264, lng:-49.0721, cat:'noturno'  },
  { id:'5', name:'Cruzamento BR-153',   lat:-22.3018, lng:-49.0481, cat:'transito' },
  { id:'6', name:'Bar da Esquina',      lat:-22.3182, lng:-49.0577, cat:'noturno'  },
  { id:'7', name:'Av. Rodrigues Alves', lat:-22.3231, lng:-49.0699, cat:'transito' },
  { id:'8', name:'Butekhon Pub',        lat:-22.3127, lng:-49.0634, cat:'noturno'  },
]

export const EVENT_META = {
  cheio:    { emoji:'🍻', label:'Lotado',          weight:3, cat:'noturno',  color:'#ff2d55' },
  evento:   { emoji:'🎉', label:'Evento ativo',    weight:3, cat:'noturno',  color:'#bf5fff' },
  morto:    { emoji:'😴', label:'Vazio',           weight:1, cat:'noturno',  color:'#6666aa' },
  pesado:   { emoji:'🚗', label:'Trânsito pesado', weight:2, cat:'transito', color:'#ff6b35' },
  bloqueio: { emoji:'🚧', label:'Bloqueio',        weight:3, cat:'transito', color:'#ffcc00' },
  acidente: { emoji:'💥', label:'Acidente',        weight:4, cat:'transito', color:'#ff2d55' },
  blitz:    { emoji:'🚔', label:'Blitz policial',  weight:3, cat:'transito', color:'#4d9fff' },
}

// Ícone padrão exibido no marcador do mapa quando o local está inativo,
// baseado na categoria do local.
export const CAT_ICON = {
  noturno:  '🍺',
  transito: '🚦',
  parque:   '🌳',
  shopping: '🛍️',
  show:     '🎵',
  esporte:  '⚽',
  default:  '📍',
}

export const EXPIRY_MS = 60 * 60 * 1000
export const STRONG_MS = 10 * 60 * 1000
export const MEDIUM_MS = 30 * 60 * 1000

export const SPAM_MAX_PER_MIN = 3
export const SPAM_WINDOW_MS   = 60 * 1000

// VAPID Key via variável de ambiente
export const VAPID_KEY = import.meta.env.VITE_VAPID_KEY

export function reputationMultiplier(reportCount = 0) {
  if (reportCount < 5)  return 0.5
  if (reportCount > 20) return 1.5
  return 1.0
}

export function getFomoLabel(heat, cat, domType) {
  if (domType === 'morto') return 'POUCO MOVIMENTO 😴'
  if (cat === 'transito') {
    if (domType === 'acidente') return 'ACIDENTE NA VIA 💥'
    if (domType === 'bloqueio') return 'VIA BLOQUEADA 🚧'
    if (domType === 'blitz')    return 'BLITZ POLICIAL 🚔'
    return heat === 'hot' ? 'TRÂNSITO INTENSO 🚗' : 'TRÂNSITO PESADO 🚗'
  }
  if (domType === 'evento') return heat === 'hot' ? 'EVENTO BOMBANDO 🎉' : 'EVENTO ROLANDO 🎉'
  if (domType === 'cheio')  return heat === 'hot' ? 'LOTADO AGORA 🔥'    : 'ENCHENDO 🍻'
  return heat === 'hot' ? 'MUITO ATIVO 🔥' : 'MOVIMENTANDO ⚡'
}

export const DEFAULT_LAT = -22.3154
export const DEFAULT_LNG = -49.0608
