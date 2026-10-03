// Applies the non-blocking webfont stylesheet (see webfonts() in vite.config.js).
document.querySelectorAll('link[data-font-swap]').forEach((l) => {
  const apply = () => (l.media = 'all')
  l.sheet ? apply() : l.addEventListener('load', apply)
})
