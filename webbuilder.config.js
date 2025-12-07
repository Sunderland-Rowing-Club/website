import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import sharp from 'sharp'
import { DateTime } from 'luxon'

async function* getFiles(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      yield* getFiles(res)
    } else {
      yield res
    }
  }
}

const thumbnailOptions = {
  width: 640,
  height: 640,
  fit: 'inside',
  withoutEnlargement: true
}

const reImageExts = /\.(?:png|jpe?g|gif|webp)$/
const reEventDate = /^Date:\s*/i
const reEventTime = /^Time:\s*/i
const reEventRecurs = /^Recurs:\s*/i
const reEventEnds = /^Ends:\s*/i
const reEventName = /^Name:\s*/i
const reEventDescription = /^Description:\s*/i
const reEventImage = /^Image:\s*/i
const reEventColor = /^Colou?r:\s*/i
const reEventLocation = /^Location:\s*/i
const reEventLink = /^Link:\s*/i

const recursMap = {
  daily: 'd',
  day: 'd',
  weekly: 'w',
  week: 'w',
  monthly: 'm',
  month: 'm',
  yearly: 'y',
  year: 'y',
  annually: 'y',
  annual: 'y',
  'week in month': 'wm',
  'week in month from end': 'wme',
  'week in month to end': 'wme',
  'week in month end': 'wme',
  'week of month': 'wm',
  'week of month from end': 'wme',
  'week of month to end': 'wme',
  'week of month end': 'wme',
  'monthly from end': 'me',
  'month from end': 'me',
  'monthly to end': 'me',
  'month to end': 'me',
  'monthly end': 'me',
  'month end': 'me'
}

async function processEvent(file) {
  const shasum = crypto.createHash('sha1')
  shasum.update(file)
  const hash = shasum
    .digest('hex')
    .match(/.{4}/g)
    .map(e => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[parseInt(e, 16) % 62])
    .join('')
  const lines = (await fs.promises.readFile(file, 'utf-8')).split('\n').map(e => e.trim())
  let date,
    time = '00:00',
    recurs,
    ends,
    name,
    image,
    color,
    location,
    link,
    desc
  for (let i = 0; i < lines.length; i++) {
    if (typeof desc !== 'undefined') {
      desc.push(lines[i])
    } else if (reEventDate.test(lines[i])) {
      date = lines[i].replace(reEventDate, '').trim()
    } else if (reEventTime.test(lines[i])) {
      time = lines[i].replace(reEventTime, '').trim()
    } else if (reEventRecurs.test(lines[i])) {
      recurs = lines[i].replace(reEventRecurs, '').trim().toLowerCase()
    } else if (reEventEnds.test(lines[i])) {
      ends = lines[i].replace(reEventEnds, '').trim()
    } else if (reEventName.test(lines[i])) {
      name = lines[i].replace(reEventName, '').trim()
    } else if (reEventImage.test(lines[i])) {
      image = lines[i].replace(reEventImage, '').trim()
    } else if (reEventColor.test(lines[i])) {
      color = lines[i].replace(reEventColor, '').trim()
    } else if (reEventLocation.test(lines[i])) {
      location = lines[i].replace(reEventLocation, '').trim()
    } else if (reEventLink.test(lines[i])) {
      link = lines[i].replace(reEventLink, '').trim()
    } else if (typeof desc === 'undefined' && lines[i] === '---') {
      desc = []
    }
  }

  if (typeof recurs === 'undefined') { // Single event
    const event = {
      name,
      date: DateTime.fromFormat(`${date} ${time} Europe/London`, 'LLL d, yyyy HH:mm z').toUnixInteger()
    }
    if (typeof image !== 'undefined') {
      event.image = image
    }
    if (typeof color !== 'undefined') {
      event.color = color
    }
    if (typeof location !== 'undefined') {
      event.location = location
    }
    if (typeof link !== 'undefined') {
      event.link = link
    }
    if ((typeof desc !== 'undefined') && desc.join('\n').trim().length) {
      event.desc = desc.join('\n').trim()
    }
    return [hash, event]
  } else { // Recurring event
    if (!(recurs in recursMap)) {
      throw 'Unknown recurs value'
    }
    const event = {
      name,
      date: DateTime.fromFormat(`${date} ${time} Europe/London`, 'LLL d, yyyy HH:mm z').toUnixInteger(),
      recurs: recursMap[recurs]
    }
    if (typeof ends !== 'undefined') {
      event.ends = DateTime.fromFormat(`${ends} 00:00 Europe/London`, 'LLL d, yyyy HH:mm z').toUnixInteger()
    }
    if (typeof image !== 'undefined') {
      event.image = image
    }
    if (typeof color !== 'undefined') {
      event.color = color
    }
    if (typeof location !== 'undefined') {
      event.location = location
    }
    if (typeof link !== 'undefined') {
      event.link = link
    }
    if ((typeof desc !== 'undefined') && desc.join('\n').trim().length) {
      event.desc = desc.join('\n').trim()
    }
    return [hash, event]
  }
}

export default {
  async build() {
    const images = []
    for await (const file of getFiles('images')) {
      if (!reImageExts.test(file)) continue;
      try {
        const img = sharp(file)
        const outPath = path.join(path.relative('images', path.dirname(file)), path.basename(file, path.extname(file)) + '.webp')

        { // Full-size version of the image
          const outFull = path.resolve(path.join('dist/assets', outPath))
          fs.mkdirSync(path.dirname(outFull), { recursive: true })
          await img.clone().webp({ quality: 90 }).toFile(outFull)
          images.push(path.relative('dist/assets', outFull).replace(/\\/g, '/'))
        }

        { // Smaller version of the image
          const outFull = path.resolve(path.join('dist/assets/thumbnails', outPath))
          fs.mkdirSync(path.dirname(outFull), { recursive: true })
          await img.resize(thumbnailOptions).webp({ quality: 80 }).toFile(outFull)
        }
      } catch {
        // If the image can't be converted, it might be corrupt, so just ignore it
      }
    }
    fs.mkdirSync('dist/assets', { recursive: true })
    await fs.promises.writeFile('dist/assets/images.json', JSON.stringify(images), 'utf-8')

    const events = []
    for await (const file of getFiles('events')) try {
      events.push(await processEvent(file))
    } catch {
      // Something is wrong with this event, ignore it
    }
    await fs.promises.writeFile('dist/assets/events.json', JSON.stringify(Object.fromEntries(events)), 'utf-8')
  },
  serveFile: [
    {
      match: /\/assets\/thumbnails\/.*\.webp$/,
      async process(filename, config, tools) {
        if (fs.existsSync(filename)) {
          return [
            await fs.promises.readFile(filename),
            'image/webp'
          ]
        } else {
          const imagesFileNoExt = path.join('images', filename.replace(/^src\/assets\/thumbnails\//, '')).slice(0, -5)
          for await (const file of getFiles(path.dirname(imagesFileNoExt))) {
            if (imagesFileNoExt === path.relative('.', path.join(path.dirname(file), path.basename(file, path.extname(file))))) {
              return [
                await sharp(file).resize(thumbnailOptions).webp({ quality: 80 }).toBuffer(),
                'image/webp'
              ]
            }
          }
        }
      }
    },
    {
      match: /\.webp$/,
      async process(filename, config, tools) {
        if (fs.existsSync(filename)) {
          return [
            await fs.promises.readFile(filename),
            'image/webp'
          ]
        } else {
          const imagesFileNoExt = path.join('images', filename.replace(/^src\/assets\//, '')).slice(0, -5)
          for await (const file of getFiles(path.dirname(imagesFileNoExt))) {
            if (imagesFileNoExt === path.relative('.', path.join(path.dirname(file), path.basename(file, path.extname(file))))) {
              return [
                await sharp(file).webp({ quality: 90 }).toBuffer(),
                'image/webp'
              ]
            }
          }
        }
      }
    },
    {
      match: /^src\/assets\/images\.json$/,
      async process(filename, config, tools) {
        const images = []
        for await (const file of getFiles('images')) {
          if (!reImageExts.test(file)) continue;
          images.push(path.join(path.relative('images', path.dirname(file)), path.basename(file, path.extname(file)) + '.webp').replace(/\\/g, '/'))
        }
        return [JSON.stringify(images), 'application/json']
      }
    },
    {
      match: /^src\/assets\/events\.json$/,
      async process(filename, config, tools) {
        const events = []
        for await (const file of getFiles('events')) try {
          events.push(await processEvent(file))
        } catch (err) {
          console.error(err)
        }
        return [JSON.stringify(Object.fromEntries(events)), 'application/json']
      }
    }
  ]
}
