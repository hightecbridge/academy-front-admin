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
  clone.style.outline = 'none'
  clone.style.outlineOffset = '0'
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

/** 여러 성적 블록을 위아래로 이어 한 장의 PNG로 저장한다. */
export async function downloadComposedPng(
  filename: string,
  width: number,
  build: (doc: HTMLElement, cleanup: (fn: () => void) => void) => Promise<void> | void,
) {
  const safeWidth = Math.max(320, Math.ceil(width))
  const host = document.createElement('div')
  host.setAttribute('data-png-host', '')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${safeWidth}px`,
    'z-index:-1',
    'pointer-events:none',
    'opacity:0',
    'background:#ffffff',
  ].join(';')

  const doc = document.createElement('div')
  doc.style.width = `${safeWidth}px`
  doc.style.boxSizing = 'border-box'
  doc.style.background = '#ffffff'
  doc.style.padding = '24px 0 32px'
  host.appendChild(doc)

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

  const cleanups: Array<() => void> = []
  try {
    await build(doc, (fn) => cleanups.push(fn))
    await Promise.all([...doc.querySelectorAll('img')].map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return
      try { await img.decode() } catch { /* 로고를 읽지 못해도 문구는 남긴다 */ }
    }))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => setTimeout(resolve, 120))
    const dataUrl = await toPng(doc, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      skipFonts: true,
      width: doc.offsetWidth,
      height: Math.max(doc.offsetHeight, doc.scrollHeight),
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${safeFilename(filename)}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    cleanups.forEach((fn) => fn())
    host.remove()
    style.remove()
  }
}
