const plan = location.href.match(/\/members\/([^\/]+)/)[1]

function shuffle(array) {
  let i = array.length, ri
  while (i !== 0) {
    ri = Math.floor(Math.random() * i)
    i--
    [array[i], array[ri]] = [array[ri], array[i]]
  }
  return array
}

let images
try {
  images = shuffle((await fetch('/assets/images.json').then(e => e.json())).filter(e => e.startsWith(`members/${plan}/`))).slice(0, 6)
} catch {
  images = []
}

const E = document.createElement.bind(document)
const showcase = document.querySelector('#gallery')

const imageObserver = new IntersectionObserver(function(entries, observer) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.src = entry.target.dataset.src
      entry.target.removeAttribute('data-src')
      imageObserver.unobserve(entry.target)
    }
  })
})

if (images.length) {
  for (const imgSrcOrig of images) {
    const img = E('img')
    img.dataset.src = `/assets/thumbnails/${imgSrcOrig}`
    imageObserver.observe(img)
    const btn = E('div')
    btn.append(img)
    btn.classList.add('gallery-image')
    btn.addEventListener('click', evt => {
      document.body.style.overflow = 'hidden'
      const img = E('img')
      img.src = `/assets/${imgSrcOrig}`
      const cover = E('div')
      cover.id = 'fullscreen-cover'
      cover.addEventListener('click', evt => {
        cover.remove()
        document.body.style.overflow = null
      })
      document.body.append(cover)
      img.addEventListener('load', evt => {
        cover.append(img)
      })
    })
    showcase.append(btn)
  }
}

const signUpButton = document.querySelector('#sign-up-button')
signUpButton.addEventListener('click', evt => {
  document.querySelector('#sign-up-section').scrollIntoView({behavior: 'smooth'})
})