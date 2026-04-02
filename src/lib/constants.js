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
  blitz:    { emoji:'🚔', label:'Blitz Policial',  weight:3, cat:'transito', color:'#3b82f6' },
}

// ── EXPIRAÇÃO POR CATEGORIA ────────────────────────────────────────────────────
export const EXPIRY_BY_CAT = {
  transito: 30 * 60 * 1000,       // 30 minutos
  noturno:  3  * 60 * 60 * 1000,  // 3 horas
  default:  60 * 60 * 1000,       // 1 hora (fallback)
}

// Legado
export const EXPIRY_MS = 60 * 60 * 1000
export const STRONG_MS = 10 * 60 * 1000
export const MEDIUM_MS = 30 * 60 * 1000

export function getExpiryMs(type) {
  const cat = EVENT_META[type]?.cat
  return EXPIRY_BY_CAT[cat] ?? EXPIRY_BY_CAT.default
}

export function getDecayThresholds(type) {
  const expiry = getExpiryMs(type)
  return {
    strong: expiry * 0.17,
    medium: expiry * 0.5,
    expiry,
  }
}

export const SPAM_MAX_PER_MIN = 3
export const SPAM_WINDOW_MS   = 60 * 1000

export function reputationMultiplier(reportCount = 0) {
  if (reportCount < 5)  return 0.5
  if (reportCount > 20) return 1.5
  return 1.0
}

export function getFomoLabel(heat, cat, domType) {
  if (domType === 'morto') return 'POUCO MOVIMENTO 😴'
  if (domType === 'blitz') return 'BLITZ POLICIAL 🚔'
  if (cat === 'transito') {
    if (domType === 'acidente') return 'ACIDENTE NA VIA 💥'
    if (domType === 'bloqueio') return 'VIA BLOQUEADA 🚧'
    return heat === 'hot' ? 'TRÂNSITO INTENSO 🚗' : 'TRÂNSITO PESADO 🚗'
  }
  if (domType === 'evento') return heat === 'hot' ? 'EVENTO BOMBANDO 🎉' : 'EVENTO ROLANDO 🎉'
  if (domType === 'cheio')  return heat === 'hot' ? 'LOTADO AGORA 🔥'    : 'ENCHENDO 🍻'
  return heat === 'hot' ? 'MUITO ATIVO 🔥' : 'MOVIMENTANDO ⚡'
}

// Categorias de local — estabelecimento precisa de moderação
export const PLACE_CATS = [
  { id:'noturno',         emoji:'🌙', label:'Festa / Noturno',   desc:'Bar, balada, show',       color:'#bf5fff', needsModeration: false },
  { id:'transito',        emoji:'🚦', label:'Trânsito / Via',    desc:'Avenida, cruzamento',     color:'#ff6b35', needsModeration: false },
  { id:'estabelecimento', emoji:'🏪', label:'Estabelecimento',   desc:'Loja, restaurante, café', color:'#ffcc00', needsModeration: true  },
]

export const DEFAULT_LAT = -22.3154
export const DEFAULT_LNG = -49.0608
export const VAPID_KEY   = 'BG6lEkaP-n5PRPH5kX5YsBvrMCQgM7hvbNLAFFFSTAD64w83CJ5z4dWD-I1le1JzOvz070Ysih4hBQWbv9vP81s'

// UID do admin — substitua pelo seu UID do Firebase Auth
export const ADMIN_UIDS = ['nDg7v4RL91NqGkr16Gei9DrInWv1']
