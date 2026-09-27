import { toPng } from 'html-to-image'

function safeFilename(name: string) {
  const trimmed = name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim()
  return (trimmed || '통계').slice(0, 80)
}

export async function downloadElementPng(el: HTMLElement, filename: string) {
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#F8F7FF',
    skipFonts: true,
    filter: (node) => {
      if (!(node instanceof Element)) return true
      return !node.closest('[data-skip-capture]')
    },
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${safeFilename(filename)}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}
