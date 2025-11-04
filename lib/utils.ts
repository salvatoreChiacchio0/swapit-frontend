import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes profile picture strings from the backend
 * Handles base64 strings, data URLs, and regular URLs/paths
 * Also handles the case where the backend returns a base64-encoded data URL
 */
export function normalizeProfilePicture(pic?: string | null): string | undefined {
  if (!pic) return undefined
  
  // Se è già un data URL completo, restituiscilo così com'è
  if (pic.startsWith('data:image')) return pic
  
  // Se è un URL o un path, restituiscilo così com'è
  if (pic.startsWith('http://') || pic.startsWith('https://') || pic.startsWith('/')) {
    return pic
  }
  
  // Il backend potrebbe restituire la stringa data URL codificata in base64
  // Prova a decodificarla per vedere se contiene un data URL
  try {
    const decoded = atob(pic)
    // Se la stringa decodificata inizia con "data:image", significa che il backend
    // ha codificato l'intera stringa data URL in base64
    if (decoded.startsWith('data:image')) {
      return decoded
    }
  } catch (e) {
    // Se la decodifica fallisce, non è base64 valido o non è un data URL codificato
    // Continua con la logica normale
  }
  
  // Altrimenti assume che sia base64 pura dell'immagine e aggiunge il prefisso
  // Prova a rilevare il tipo di immagine guardando i primi caratteri della stringa base64
  // JPG inizia con /9j/, PNG con iVBORw0KGgo, GIF con R0lGODlh, WebP con UklGR
  let mimeType = 'image/png' // default
  if (pic.startsWith('/9j/')) mimeType = 'image/jpeg'
  else if (pic.startsWith('iVBORw0KGgo')) mimeType = 'image/png'
  else if (pic.startsWith('R0lGODlh')) mimeType = 'image/gif'
  else if (pic.startsWith('UklGR')) mimeType = 'image/webp'
  return `data:${mimeType};base64,${pic}`
}
