




export interface CustomFont {
  family: string
  url: string
}

const GOOGLE_FONTS_API = 'https://fonts.googleapis.com/css2'




export function getGoogleFontUrl(family: string): string {
  const encodedFamily = encodeURIComponent(family)
  return `${GOOGLE_FONTS_API}?family=${encodedFamily}:wght@100;200;300;400;500;600;700;800;900&display=swap`
}




export function loadFont(font: CustomFont): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingLink = document.querySelector(`link[data-font-family="${font.family}"]`)
    if (existingLink) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = font.url
    link.setAttribute('data-font-family', font.family)

    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load font: ${font.family}`))

    document.head.appendChild(link)
  })
}




export function unloadFont(family: string): void {
  const link = document.querySelector(`link[data-font-family="${family}"]`)
  if (link) {
    link.remove()
  }
}




export function applyFont(family: string | null): void {
  const root = document.documentElement
  if (family) {
    root.style.setProperty(
      '--font-sans',
      `'${family}', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
    )
  } else {

    root.style.setProperty(
      '--font-sans',
      "'Geist', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    )
  }
}




export async function initializeFonts(
  customFonts: CustomFont[],
  activeFont: string | null
): Promise<void> {

  await Promise.all(customFonts.map((font) => loadFont(font).catch(console.error)))


  applyFont(activeFont)
}




export function isValidGoogleFontFamily(family: string): boolean {

  return family.length > 0 && family.length <= 100 && /^[a-zA-Z0-9\s]+$/.test(family)
}