window.E = (tagName = 'div', options) => $(document.createElement(tagName, options))

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]
const dayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
]

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', hour12: true })
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short', hour12: true })

function getDateIndex(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function getLastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function getWeekOfMonth(date) {
  var firstWeekday = new Date(date.getFullYear(), date.getMonth(), 1).getDay() - 1
  if (firstWeekday < 0) firstWeekday = 6
  var offsetDate = date.getDate() + firstWeekday - 1
  return Math.floor(offsetDate / 7)
}

function occursOn(event, date) {
  if (event.midnight <= date && date < (event.ends ?? Infinity)) {
    switch (event.recurs) {
      case 'd': // Daily
        return true
      case 'w': // Weekly
        return event.start.getDay() === date.getDay()
      case 'm': // Monthly
        return event.start.getDate() === date.getDate()
      case 'y': // Yearly
        return event.start.getDate() === date.getDate() && event.start.getMonth() === date.getMonth()
      case 'me': // Monthly from end
        return event.daysUntilEndOfMonth === getLastDayOfMonth(date).getDate() - date.getDate()
      case 'wm': // Week of month
        return event.start.getDay() === date.getDay() && event.weekOfMonth === getWeekOfMonth(date)
      case 'wme': // Week of month from end
        return event.start.getDay() === date.getDay() && event.weekOfMonth === getWeekOfMonth(getLastDayOfMonth(date)) - getWeekOfMonth(date)
    }
  } else {
    return false
  }
}

function getNextOccurrence(event, date = new Date) {
  if (!('recurs' in event)) {
    return event.date < date ? null : new Date(event.date)
  }
  if (event.start >= date) {
    return new Date(event.start)
  }
  if ('ends' in event && date > event.ends) {
    return null
  }
  const d = new Date(date)
  d.setHours(event.start.getHours())
  d.setMinutes(event.start.getMinutes())
  d.setSeconds(event.start.getSeconds())
  d.setMilliseconds(event.start.getMilliseconds())
  while (!occursOn(event, d) || d < date) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

function getEventLink(event, date) {
  console.log(event)
  if ('link' in event) {
    return event.link
  } else {
    return `/event?id=${event.id}${'recurs' in event ? `&d=${(date ?? getNextOccurrence(event)).valueOf() / 1000}` : ''}`
  }
}

// class EventCalendar extends HTMLElement {
//   #events
//   #recurringEvents

//   constructor(year, month) {
//     super()
//     this.#events = {}
//     this.#recurringEvents = []
//     this.attachShadow({ mode: 'open' })
//     E('style').append(_stylf`/includes/components/calendar.styl`).appendTo(this.shadowRoot)
//     this.monthNameDisplay = E('div').addClass('month-name-display')
//     E('div').addClass('nav-bar').append(
//       this.monthNameDisplay,
//       E('button').addClass('prev-month-button').append($('#chevron-left-icon')[0].content.cloneNode(true), 'Previous month').on('click', evt => this.prevMonth()),
//       E('button').addClass('next-month-button').append('Next month', $('#chevron-right-icon')[0].content.cloneNode(true)).on('click', evt => this.nextMonth())
//     ).appendTo(this.shadowRoot)
//     this.grid = E('div').addClass('day-grid').appendTo(this.shadowRoot)

//     /*
//       Setting the first argument to false should disable the automatic refresh here
//     */
//     if (year !== false) {
//       this.setMonth(year, month)
//     }
//   }

//   setMonth(year, month) {
//     if (month === -1) {
//       year--
//       month = 11
//     } else if (month === 12) {
//       year++
//       month = 0
//     }
//     this.monthDate = new Date(year, month)
//     const d = new Date(year, month), todayIndex = getDateIndex(new Date)
//     this.grid.empty().append(
//       dayNames.map(e => E('div').addClass('day-name').text(e))
//     )
//     for (let i = 1 - d.getDay() > 0 ? -6 - d.getDay() : 1 - d.getDay(), j = 0; j < 42; i++, j++) {
//       const e = new Date(d)
//       e.setDate(d.getDate() + i)
//       const dateIndex = getDateIndex(e)
//       let dateEl
//       this.grid.append(
//         dateEl = E('div').addClass([
//           'date',
//           e.getMonth() === month ? '' : 'off-month',
//           dateIndex === todayIndex ? 'today' : ''
//         ]).attr('data-date', e.getDate())
//       )
//       const events = []
//       if (dateIndex in this.#events) {
//         events.push(...this.#events[dateIndex])
//       }
//       for (const event of this.#recurringEvents) if (occursOn(event, e)) {
//         events.push(event)
//       }
//       if (events.length) {
//         events.sort((a, b) => getNextOccurrence(a, e) - getNextOccurrence(b, e))
//         dateEl.append(E('ul').addClass('events-list').append(
//           events.map(event => {
//             const date = new Date(e)
//             date.setHours(event.date.getHours())
//             date.setMinutes(event.date.getMinutes())
//             return E('li').append(
//               E('a')
//                 .addClass('event')
//                 .attr('href', getEventLink(event, date))
//                 .css('--event-color', 'color' in event ? `var(--event-color-${event.color})` : '#fff')
//                 .text(event.name)
//             )
//           })
//         ))
//       }
//     }
//     this.monthNameDisplay.text(`${monthNames[month]} ${year}`)
//   }

//   nextMonth() {
//     this.setMonth(this.monthDate.getFullYear(), this.monthDate.getMonth() + 1)
//   }

//   prevMonth() {
//     this.setMonth(this.monthDate.getFullYear(), this.monthDate.getMonth() - 1)
//   }

//   refresh() {
//     this.setMonth(this.monthDate.getFullYear(), this.monthDate.getMonth())
//   }

//   addEvent(event, refresh = true) {
//     if ('recurs' in event) {
//       this.#recurringEvents.push(event)
//     } else {
//       const dateIndex = getDateIndex(event.date)
//       const events = this.#events[dateIndex] ??= []
//       events.push(event)
//     }
//     if (refresh) {
//       this.refresh()
//     }
//   }
// }

// customElements.define('event-calendar', EventCalendar)

// const calendar = new EventCalendar(false)
// $('#calendar').append(calendar)

const events = Object.entries(await fetch('/assets/events.json').then(e => e.json())).map(([id, event]) => {
  event.id = id
  event.date = new Date(event.date * 1000)
  if ('ends' in event) {
    event.ends = new Date(event.ends * 1000)
  }
  if ('recurs' in event) {
    event.start = event.date
    event.midnight = new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate())
    switch (event.recurs) {
      case 'me':
        event.daysUntilEndOfMonth = getLastDayOfMonth(event.start).getDate() - event.start.getDate()
        break
      case 'wm':
        event.weekOfMonth = getWeekOfMonth(event.start)
        break
      case 'wme':
        event.weekOfMonth = getWeekOfMonth(getLastDayOfMonth(event.start)) - getWeekOfMonth(event.start)
        break
    }
    event.date = getNextOccurrence(event)
  }
  // calendar.addEvent(event, false)
  return event
}).sort((a, b) => a.date - b.date)
const now = new Date
// calendar.setMonth(now.getFullYear(), now.getMonth())

// Filter out recurring and past events, sort them by date, and get the first three
for (const event of events.filter(e => e.date - now >= 0).sort((a, b) => a.date - b.date).slice(0, Infinity)) {
  // Look at only including events of current year (i.e. Infinity needs to be changed to sliding variable)
  // Add event to the upcoming events list
  $('#upcoming-events').append(
    E('a').addClass('event-button').attr('href', getEventLink(event, event.date)).append(
      E('div').addClass('event-button-name').text(event.name),
      E('div').addClass('event-button-description').text(event.desc),
      E('div').addClass('event-button-date').text(dateFormat.format(event.date)),
      E('div').addClass('click-for-more').text("Click for more info")
    )
    // Add event location to this?
  )
}

const upcomingEventsButton = document.querySelector('#upcoming-events-button')
upcomingEventsButton.addEventListener('click', evt => {
  document.querySelector('#upcoming-events-section').scrollIntoView({ behavior: 'smooth' })
})