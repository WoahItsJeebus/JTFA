/* ============================================================
   timers.js — Timer Tracker
   ============================================================ */

import { DEFAULT_TIMERS } from "./config.js"

const LS_KEY = "JTFA_timers"

// ── Storage ───────────────────────────────────────────────────
function loadTimers() {
	try {
		const raw = localStorage.getItem(LS_KEY)
		if (raw) {
			const parsed = JSON.parse(raw)
			if (Array.isArray(parsed) && parsed.length > 0) return parsed
		}
	} catch {}
	const defaults = DEFAULT_TIMERS.map(t => ({ ...t }))
	saveTimers(defaults)
	return defaults
}

function saveTimers(timers) {
	localStorage.setItem(LS_KEY, JSON.stringify(timers))
}

function updateTimerLabel(timers, id, label) {
	const timer = timers.find(t => t.id === id)
	if (!timer) return
	timer.label = label
	saveTimers(timers)
}

// ── Time math ─────────────────────────────────────────────────
function calcTimeSince(startISO) {
	const now   = new Date()
	const start = new Date(startISO)
	const diffMs = Math.max(0, now - start)

	// Calendar-based waterfall breakdown
	let years   = now.getFullYear() - start.getFullYear()
	let months  = now.getMonth()    - start.getMonth()
	let days    = now.getDate()     - start.getDate()
	let hours   = now.getHours()    - start.getHours()
	let minutes = now.getMinutes()  - start.getMinutes()
	let seconds = now.getSeconds()  - start.getSeconds()

	if (seconds < 0) { seconds += 60; minutes-- }
	if (minutes < 0) { minutes += 60; hours-- }
	if (hours   < 0) { hours   += 24; days-- }
	if (days    < 0) {
		const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
		days += daysInPrevMonth
		months--
	}
	if (months  < 0) { months  += 12; years-- }

	const weeks   = Math.floor(days / 7)
	const remDays = days % 7

	// Running totals
	const totalSeconds = Math.floor(diffMs / 1000)
	const totalMinutes = Math.floor(diffMs / 60000)
	const totalHours   = Math.floor(diffMs / 3600000)
	const totalDays    = Math.floor(diffMs / 86400000)
	const totalWeeks   = Math.floor(diffMs / (7 * 86400000))

	let totalMonths = (now.getFullYear() - start.getFullYear()) * 12
	               + (now.getMonth()    - start.getMonth())
	if (now.getDate() < start.getDate()) totalMonths--
	totalMonths = Math.max(0, totalMonths)

	return {
		years, months, weeks, remDays, hours, minutes, seconds,
		totalMonths, totalWeeks, totalDays, totalHours, totalMinutes, totalSeconds,
	}
}

// ── Passage text ──────────────────────────────────────────────
function passageChunks({ years, months, weeks, remDays, hours, minutes, seconds }) {
	const p = (n, s) => `${n.toLocaleString()} ${n === 1 ? s : s + "s"}`
	const parts = []
	if (years   > 0) parts.push(p(years,   "year"))
	if (months  > 0) parts.push(p(months,  "month"))
	if (weeks   > 0) parts.push(p(weeks,   "week"))
	if (remDays > 0) parts.push(p(remDays, "day"))
	parts.push(`${hours}h`)
	parts.push(`${String(minutes).padStart(2, "0")}m`)
	parts.push(`${String(seconds).padStart(2, "0")}s`)
	return parts
}

// ── DOM helper ────────────────────────────────────────────────
function el(tag, cls, text) {
	const e = document.createElement(tag)
	if (cls)  e.className   = cls
	if (text !== undefined) e.textContent = text
	return e
}

// ── Build a timer card ────────────────────────────────────────
function createTimerCard(timer, cardDelay = 0) {
	const t    = calcTimeSince(timer.start)
	const card = el("div", "timer-card")
	card.dataset.id    = timer.id
	card.dataset.start = timer.start
	card.style.animationDelay = `${cardDelay}s`

	// ── Header
	const header   = el("div", "timer-card-header")
	const labelEl  = el("span", "timer-card-label", timer.label)
	labelEl.setAttribute("role", "button")
	labelEl.setAttribute("tabindex", "0")
	labelEl.setAttribute("title", "Click to edit title")
	const sinceEl  = el("span", "timer-card-since", fmtSince(timer.start))
	const delBtn   = el("button", "timer-delete-btn", "×")
	delBtn.setAttribute("aria-label", "Remove timer")
	delBtn.dataset.id = timer.id
	header.append(labelEl, sinceEl, delBtn)

	// ── Top orbiters: months & weeks totals
	const topOrb = el("div", "timer-orbiters timer-orbiters-top")
	const moEl = buildTotal("totalMonths", `${fmt(t.totalMonths)} months`, cardDelay, 0)
	const wkEl = buildTotal("totalWeeks",  `${fmt(t.totalWeeks)} weeks`,   cardDelay, 1)
	topOrb.append(moEl, wkEl)

	// ── Passage (center)
	const passage = el("div", "timer-passage")
	const chunks  = passageChunks(t)
	chunks.forEach((chunk, i) => {
		const span = el("span", "tp-chunk", i < chunks.length - 1 ? chunk + "," : chunk)
		span.style.animationDelay = `${cardDelay + 0.55 + i * 0.07}s`
		passage.appendChild(span)
	})

	// ── Bottom orbiters: days, hours, minutes, seconds totals
	const botOrb = el("div", "timer-orbiters timer-orbiters-bot")
	const dEl = buildTotal("totalDays",    `${fmt(t.totalDays)} days`,    cardDelay, 2)
	const hEl = buildTotal("totalHours",   `${fmt(t.totalHours)} hrs`,    cardDelay, 3)
	const mEl = buildTotal("totalMinutes", `${fmt(t.totalMinutes)} min`,  cardDelay, 4)
	const sEl = buildTotal("totalSeconds", `${fmt(t.totalSeconds)} sec`,  cardDelay, 5)
	botOrb.append(dEl, hEl, mEl, sEl)

	const body = el("div", "timer-card-body")
	body.append(topOrb, passage, botOrb)
	card.append(header, body)

	return card
}

function buildTotal(key, text, cardDelay, idx) {
	const div = el("div", "timer-total", text)
	div.dataset.key = key
	div.style.animationDelay = `${cardDelay + 0.52 + idx * 0.06}s`
	return div
}

function fmt(n) { return n.toLocaleString() }

function fmtSince(iso) {
	return "Since " + new Date(iso).toLocaleString(undefined, {
		month: "short", day: "numeric", year: "numeric",
		hour: "numeric", minute: "2-digit",
	})
}

// ── Live update a card ────────────────────────────────────────
function updateTimerCard(card) {
	const t      = calcTimeSince(card.dataset.start)
	const chunks = passageChunks(t)
	const spans  = card.querySelectorAll(".tp-chunk")

	if (spans.length !== chunks.length) {
		// Chunk count changed (e.g. a new year/month crossed) — rebuild passage
		const passage = card.querySelector(".timer-passage")
		if (passage) {
			passage.innerHTML = ""
			chunks.forEach((chunk, i) => {
				const span = el("span", "tp-chunk tp-chunk--live",
					i < chunks.length - 1 ? chunk + "," : chunk)
				passage.appendChild(span)
			})
		}
	} else {
		spans.forEach((span, i) => {
			span.textContent = i < chunks.length - 1 ? chunks[i] + "," : chunks[i]
		})
	}

	const totals = {
		totalMonths:  `${fmt(t.totalMonths)} months`,
		totalWeeks:   `${fmt(t.totalWeeks)} weeks`,
		totalDays:    `${fmt(t.totalDays)} days`,
		totalHours:   `${fmt(t.totalHours)} hrs`,
		totalMinutes: `${fmt(t.totalMinutes)} min`,
		totalSeconds: `${fmt(t.totalSeconds)} sec`,
	}
	for (const [key, val] of Object.entries(totals)) {
		const tEl = card.querySelector(`[data-key="${key}"]`)
		if (tEl) tEl.textContent = val
	}
}

// ── Main entry ────────────────────────────────────────────────
export function initTimers() {
	const mount = document.getElementById("timerMount")
	if (!mount) return

	let timers = loadTimers()

	// Render initial cards with staggered entry
	timers.forEach((timer, idx) => {
		mount.appendChild(createTimerCard(timer, idx * 0.14))
	})

	// Tick every second — update text in place, no re-animation
	setInterval(() => {
		mount.querySelectorAll(".timer-card:not(.timer-card--removing)").forEach(updateTimerCard)
	}, 1000)

	// ── Add timer modal
	const addBtn     = document.getElementById("addTimerBtn")
	const modal      = document.getElementById("addTimerModal")
	const cancelBtn  = document.getElementById("modalCancelBtn")
	const confirmBtn = document.getElementById("modalAddBtn")
	const labelInp   = document.getElementById("timerLabelInput")
	const startInp   = document.getElementById("timerStartInput")

	function openModal() {
		labelInp.value = ""
		// Pre-fill with current local datetime
		const now = new Date()
		now.setSeconds(0, 0)
		startInp.value = now.toISOString().slice(0, 16)
		modal.classList.remove("hidden")
		setTimeout(() => labelInp.focus(), 50)
	}

	function closeModal() { modal.classList.add("hidden") }

	addBtn?.addEventListener("click", openModal)
	cancelBtn?.addEventListener("click", closeModal)
	modal?.addEventListener("click", e => { if (e.target === modal) closeModal() })

	confirmBtn?.addEventListener("click", () => {
		const label = labelInp.value.trim() || "Timer"
		const start = startInp.value
		if (!start) { startInp.focus(); return }
		const timer = { id: `t_${Date.now()}`, label, start }
		timers.push(timer)
		saveTimers(timers)
		const card = createTimerCard(timer, 0)
		card.classList.add("timer-card--new")
		mount.appendChild(card)
		closeModal()
	})

	// Enter key in label input submits
	labelInp?.addEventListener("keydown", e => { if (e.key === "Enter") startInp.focus() })
	startInp?.addEventListener("keydown", e => { if (e.key === "Enter") confirmBtn?.click() })

	// ── Edit title inline (event delegation on mount)
	function startInlineTitleEdit(labelEl) {
		const card = labelEl.closest(".timer-card")
		if (!card || card.querySelector(".timer-title-edit")) return

		const oldValue = labelEl.textContent || ""
		const input = el("input", "timer-title-edit")
		input.type = "text"
		input.value = oldValue
		input.setAttribute("aria-label", "Edit timer title")

		labelEl.replaceWith(input)
		input.focus()
		input.select()

		let done = false
		const finish = commit => {
			if (done) return
			done = true
			const next = (commit ? input.value.trim() : oldValue) || "Timer"
			const newLabel = el("span", "timer-card-label", next)
			newLabel.setAttribute("role", "button")
			newLabel.setAttribute("tabindex", "0")
			newLabel.setAttribute("title", "Click to edit title")
			input.replaceWith(newLabel)

			if (commit && next !== oldValue) {
				updateTimerLabel(timers, card.dataset.id, next)
			}
		}

		input.addEventListener("keydown", e => {
			if (e.key === "Enter") finish(true)
			if (e.key === "Escape") finish(false)
		})
		input.addEventListener("blur", () => finish(true))
	}

	mount.addEventListener("click", e => {
		const labelEl = e.target.closest(".timer-card-label")
		if (!labelEl) return
		startInlineTitleEdit(labelEl)
	})

	mount.addEventListener("keydown", e => {
		const labelEl = e.target.closest(".timer-card-label")
		if (!labelEl) return
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault()
			startInlineTitleEdit(labelEl)
		}
	})

	// ── Delete (event delegation on mount)
	mount.addEventListener("click", e => {
		const btn = e.target.closest(".timer-delete-btn")
		if (!btn) return
		const id   = btn.dataset.id
		timers = timers.filter(t => t.id !== id)
		saveTimers(timers)
		const card = mount.querySelector(`.timer-card[data-id="${id}"]`)
		if (card) {
			card.classList.add("timer-card--removing")
			card.addEventListener("animationend", () => card.remove(), { once: true })
		}
	})
}
