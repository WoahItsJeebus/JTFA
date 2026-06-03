/* ============================================================
   calendar.js — NY Pension Payment Calendar
   ============================================================ */

// 2026 pension payment dates from osc.ny.gov
// { month (0-indexed): { mailing: day, deposit: day } }
const PAYMENT_DATES_2026 = {
	0:  { mailing: 29, deposit: 30 },  // January
	1:  { mailing: 26, deposit: 27 },  // February
	2:  { mailing: 30, deposit: 31 },  // March
	3:  { mailing: 29, deposit: 30 },  // April
	4:  { mailing: 28, deposit: 29 },  // May
	5:  { mailing: 29, deposit: 30 },  // June
	6:  { mailing: 30, deposit: 31 },  // July
	7:  { mailing: 28, deposit: 31 },  // August
	8:  { mailing: 29, deposit: 30 },  // September
	9:  { mailing: 29, deposit: 30 },  // October
	10: { mailing: 27, deposit: 30 },  // November
	11: { mailing: 30, deposit: 31 },  // December
}

const PAYMENT_DATES_2027 = {
	0:  { mailing: 28, deposit: 29 },  // January
	1:  { mailing: 25, deposit: 26 },  // February
	2:  { mailing: 30, deposit: 31 },  // March
}

const ALL_PAYMENTS = { 2026: PAYMENT_DATES_2026, 2027: PAYMENT_DATES_2027 }

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const DAY_MS = 24 * 60 * 60 * 1000

const CELL_W = 130
const CELL_H = 100

let _currentMonth = new Date().getMonth()
let _currentYear = 2026

function getPayment(year, month) {
	const y = ALL_PAYMENTS[year]
	return y ? y[month] : null
}

function getDaysFromTodayTo(year, month, day, fromDate = new Date()) {
	const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
	const target = new Date(year, month, day)
	return Math.round((target - start) / DAY_MS)
}

function formatCountdownText(type, year, month, day, daysFromToday) {
	const typeLabel = type === "mailing" ? "mailing" : "direct deposit"
	const dateText = `${MONTH_NAMES[month]} ${day}, ${year}`

	if (daysFromToday === 0) return `Today is ${typeLabel} day (${dateText})`

	const absDays = Math.abs(daysFromToday)
	const dayWord = absDays === 1 ? "day" : "days"
	if (daysFromToday > 0) return `${absDays} ${dayWord} until ${typeLabel} day (${dateText})`
	return `${absDays} ${dayWord} since ${typeLabel} day (${dateText})`
}

function updateCountdownLabels() {
	const mailingLabel = document.getElementById("countdownMailing")
	const depositLabel = document.getElementById("countdownDeposit")
	if (!mailingLabel || !depositLabel) return

	const payment = getPayment(_currentYear, _currentMonth)
	if (!payment) {
		const monthYear = `${MONTH_NAMES[_currentMonth]} ${_currentYear}`
		mailingLabel.textContent = `No mailing date data for ${monthYear}`
		depositLabel.textContent = `No direct deposit date data for ${monthYear}`
		return
	}

	const mailingDays = getDaysFromTodayTo(_currentYear, _currentMonth, payment.mailing)
	const depositDays = getDaysFromTodayTo(_currentYear, _currentMonth, payment.deposit)

	mailingLabel.textContent = formatCountdownText("mailing", _currentYear, _currentMonth, payment.mailing, mailingDays)
	depositLabel.textContent = formatCountdownText("deposit", _currentYear, _currentMonth, payment.deposit, depositDays)
}

function buildCalendar(mount, source = null) {
	mount.innerHTML = ""

	const wrap = document.createElement("div")
	wrap.className = "cal-wrap"

	// Title
	const title = document.createElement("div")
	title.className = "cal-title"
	title.textContent = source?.title ?? "NY Pension Payment Calendar"
	wrap.appendChild(title)

	const mailingCountdown = document.createElement("div")
	mailingCountdown.className = "cal-countdown mailing"
	mailingCountdown.id = "countdownMailing"
	mailingCountdown.textContent = "Loading upcoming mailing day..."
	wrap.appendChild(mailingCountdown)

	const depositCountdown = document.createElement("div")
	depositCountdown.className = "cal-countdown deposit"
	depositCountdown.id = "countdownDeposit"
	depositCountdown.textContent = "Loading upcoming direct deposit day..."
	wrap.appendChild(depositCountdown)

	const subtitle = document.createElement("div")
	subtitle.className = "cal-subtitle"
	if (source?.url) {
		const hostname = new URL(source.url).hostname
		subtitle.innerHTML = `Source: <a href="${source.url}" target="_blank" rel="noopener">${hostname}</a>`
	} else {
		subtitle.innerHTML = `Source: <a href="https://www.osc.ny.gov/retirement/retirees/pension-payment-calendar" target="_blank" rel="noopener">osc.ny.gov</a>`
	}
	wrap.appendChild(subtitle)

	// Version badge
	const badge = document.createElement("code")
	badge.className = "inline versionBadge"
	badge.id = "versionCode"
	badge.textContent = "v—"
	wrap.appendChild(badge)

	// Calendar table
	const table = document.createElement("div")
	table.className = "cal-grid"
	table.id = "calGrid"
	wrap.appendChild(table)

	mount.appendChild(wrap)
	renderMonth()
}

function renderMonth() {
	const grid = document.getElementById("calGrid")
	if (!grid) return
	grid.innerHTML = ""

	const label = document.getElementById("monthLabel")
	if (label) label.textContent = `${MONTH_NAMES[_currentMonth]} ${_currentYear}`

	const payment = getPayment(_currentYear, _currentMonth)
	updateCountdownLabels()

	// Day-of-week header
	for (const d of DAY_NAMES) {
		const hdr = document.createElement("div")
		hdr.className = "cal-header"
		hdr.textContent = d
		grid.appendChild(hdr)
	}

	const firstDay = new Date(_currentYear, _currentMonth, 1).getDay()
	const daysInMonth = new Date(_currentYear, _currentMonth + 1, 0).getDate()
	const today = new Date()

	// Leading blanks
	for (let i = 0; i < firstDay; i++) {
		const blank = document.createElement("div")
		blank.className = "cal-cell cal-blank"
		grid.appendChild(blank)
	}

	// Day cells
	for (let d = 1; d <= daysInMonth; d++) {
		const cell = document.createElement("div")
		cell.className = "cal-cell"

		const isToday = d === today.getDate()
			&& _currentMonth === today.getMonth()
			&& _currentYear === today.getFullYear()
		if (isToday) cell.classList.add("cal-today")

		// Weekend
		const dow = (firstDay + d - 1) % 7
		if (dow === 0 || dow === 6) cell.classList.add("cal-weekend")

		const num = document.createElement("span")
		num.className = "cal-day-num"
		num.textContent = d
		cell.appendChild(num)

		// Payment badges
		if (payment) {
			const badges = document.createElement("div")
			badges.className = "cal-badges"

			if (d === payment.mailing) {
				const m = document.createElement("span")
				m.className = "cal-badge mailing"
				m.textContent = "M"
				m.title = "Check Mailing Date"
				badges.appendChild(m)
				cell.classList.add("cal-payment")
			}
			if (d === payment.deposit) {
				const dd = document.createElement("span")
				dd.className = "cal-badge deposit"
				dd.textContent = "D"
				dd.title = "Direct Deposit Date"
				badges.appendChild(dd)
				cell.classList.add("cal-payment")
			}
			if (badges.children.length) cell.appendChild(badges)
		}

		grid.appendChild(cell)
	}

	// Trailing blanks to fill last row
	const totalCells = firstDay + daysInMonth
	const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
	for (let i = 0; i < trailing; i++) {
		const blank = document.createElement("div")
		blank.className = "cal-cell cal-blank"
		grid.appendChild(blank)
	}
}

function changeMonth(delta) {
	_currentMonth += delta
	if (_currentMonth > 11) { _currentMonth = 0; _currentYear++ }
	if (_currentMonth < 0) { _currentMonth = 11; _currentYear-- }
	renderMonth()
}

export function initCalendar(grid) {
	const mount = document.getElementById("calendarMount")
	if (!mount) return

	// Wire up month selector buttons
	document.getElementById("prevMonth")?.addEventListener("click", e => {
		e.stopPropagation()
		changeMonth(-1)
	})
	document.getElementById("nextMonth")?.addEventListener("click", e => {
		e.stopPropagation()
		changeMonth(1)
	})

	// Load calendar sources, then build; load version badge after DOM is ready
	fetch("./assets/calendar-sources.json", { cache: "no-store" })
		.then(r => r.ok ? r.json() : Promise.reject())
		.then(d => {
			const source = d.sources?.find(s => s.active) ?? d.sources?.[0] ?? null
			buildCalendar(mount, source)
		})
		.catch(() => buildCalendar(mount))
		.finally(() => {
			fetch("./assets/versions.json", { cache: "no-store" })
				.then(r => r.ok ? r.json() : Promise.reject())
				.then(d => { const el = document.getElementById("versionCode"); if (el) el.textContent = `v${d.current || "?"}` })
				.catch(() => {})
		})
}
