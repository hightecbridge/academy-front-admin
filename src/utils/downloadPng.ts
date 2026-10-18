import { toPng } from 'html-to-image'

function safeFilename(name: string) {
  const trimmed = name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim()
  return (trimmed || '통계').slice(0, 80)
}

/**
 * html-to-image draws the node inside an SVG image, which cannot see the page's
 * web font. Korean glyphs then paint taller than the measured line and the top
 * is clipped. Lay the copy out in a local Korean font so the line box matches
 * what the image actually draws.
 */
export async function downloadElementPng(el: HTMLElement, filename: string) {
  const width = Math.ceil(el.getBoundingClientRect().width)
  const host = document.createElement('div')
  host.setAttribute('data-png-host', '')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${width}px`,
    'z-index:-1',
    'pointer-events:none',
    'opacity:0',
    'background:#ffffff',
  ].join(';')

  const clone = el.cloneNode(true) as HTMLElement
  clone.querySelectorAll('[data-skip-capture]').forEach((node) => node.remove())
  clone.style.width = `${width}px`
  clone.style.maxWidth = `${width}px`
  clone.style.margin = '0'
  clone.style.overflow = 'visible'
  clone.style.background = '#ffffff'
  clone.style.boxSizing = 'border-box'
  clone.style.paddingTop = '16px'
  clone.style.paddingBottom = '8px'
  host.appendChild(clone)

  const style = document.createElement('style')
  style.textContent = `
    [data-png-host], [data-png-host] * {
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif !important;
      overflow: visible !important;
    }
    [data-png-host] [data-capture-text] {
      display: block;
      padding-top: 8px !important;
      padding-bottom: 4px !important;
      line-height: 1.8 !important;
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(host)

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

  try {
    const dataUrl = await toPng(clone, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      skipFonts: true,
      width: clone.offsetWidth,
      height: clone.offsetHeight,
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${safeFilename(filename)}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    host.remove()
    style.remove()
  }
}
