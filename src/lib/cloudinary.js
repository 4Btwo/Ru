// ── CLOUDINARY UPLOAD ─────────────────────────────────────────────────────────
// Configure as variáveis no seu .env:
//   VITE_CLOUDINARY_CLOUD_NAME=seu_cloud_name
//   VITE_CLOUDINARY_UPLOAD_PRESET=seu_preset_unsigned
//
// No Cloudinary: Settings → Upload → Upload Presets → Add upload preset
// Mode: Unsigned. Copie o preset name e o cloud name.

const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

function checkConfig() {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary não configurado. Adicione no arquivo .env:\n' +
      'VITE_CLOUDINARY_CLOUD_NAME=seu_cloud_name\n' +
      'VITE_CLOUDINARY_UPLOAD_PRESET=seu_preset_name'
    )
  }
}

export async function uploadToCloudinary(file) {
  checkConfig()

  if (!file.type.startsWith('image/'))
    throw new Error('Apenas imagens são permitidas.')

  if (file.size > 10 * 1024 * 1024)
    throw new Error('Imagem muito grande. Máximo: 10MB.')

  const compressed = await compressImage(file, 1200, 0.82)

  const formData = new FormData()
  formData.append('file',          compressed)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder',        'urbyn')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err?.error?.message ||
      `Upload falhou (HTTP ${res.status}). Verifique as credenciais no .env.`
    )
  }

  const data = await res.json()
  return data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
}

async function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const scale  = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Falha ao comprimir imagem.')); return }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida.')) }
    img.src = url
  })
}
