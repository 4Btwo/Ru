// ── CLOUDINARY UPLOAD ─────────────────────────────────────────────────────────
// Upload sem autenticação via unsigned preset
// Configure em: cloudinary.com → Settings → Upload Presets → Add unsigned preset
//
// 1. Crie uma conta grátis em cloudinary.com
// 2. Vá em Settings → Upload → Upload Presets → Add upload preset
// 3. Modo: Unsigned. Copie o preset name e o cloud name abaixo.

const CLOUD_NAME   = 'SEU_CLOUD_NAME'    // ex: 'dxyz1234'
const UPLOAD_PRESET = 'SEU_PRESET_NAME'  // ex: 'radar_urbano'

/**
 * Faz upload de um File para o Cloudinary.
 * Retorna a URL pública da imagem.
 */
export async function uploadToCloudinary(file) {
  // Comprime antes de enviar (max 1200px, qualidade 82%)
  const compressed = await compressImage(file, 1200, 0.82)

  const formData = new FormData()
  formData.append('file',           compressed)
  formData.append('upload_preset',  UPLOAD_PRESET)
  formData.append('folder',         'radar-urbano')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) throw new Error('Upload falhou')
  const data = await res.json()

  // Retorna URL otimizada (auto format + quality)
  return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
}

/**
 * Comprime uma imagem via Canvas antes do upload.
 */
async function compressImage(file, maxWidth, quality) {
  return new Promise((resolve) => {
    const img  = new Image()
    const url  = URL.createObjectURL(file)
    img.onload = () => {
      const scale  = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = img.width  * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(new File([blob], file.name, { type:'image/jpeg' })),
        'image/jpeg', quality)
    }
    img.src = url
  })
}
