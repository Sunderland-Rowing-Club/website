const imageObserver = new IntersectionObserver(function(entries, observer) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.src = entry.target.dataset.src
      entry.target.removeAttribute('data-src')
      imageObserver.unobserve(entry.target)
    }
  })
})

for (const img of document.querySelectorAll('.section img')) {
  imageObserver.observe(img)
}
