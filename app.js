const STORAGE_KEYS = {
  targets: "calorieCarbTargetsByDate",
  entries: "calorieCarbEntries",
  selectedDate: "calorieCarbSelectedDate",
  calendarMonth: "calorieCarbCalendarMonth",
};

const DEFAULT_TARGETS = {
  calories: { min: 1500, max: 2200 },
  carbs: { min: 130, max: 250 },
};

const state = {
  targetsByDate: {},
  entries: {},
  selectedDate: new Date().toISOString().slice(0, 10),
  calendarMonth: new Date().toISOString().slice(0, 7),
  editing: null,
};

const el = {
  calMin: document.getElementById("calMin"),
  calMax: document.getElementById("calMax"),
  carbMin: document.getElementById("carbMin"),
  carbMax: document.getElementById("carbMax"),
  saveTargetsBtn: document.getElementById("saveTargetsBtn"),

  selectedDate: document.getElementById("selectedDate"),
  todayBtn: document.getElementById("todayBtn"),

  foodName: document.getElementById("foodName"),
  foodCalories: document.getElementById("foodCalories"),
  foodCarbs: document.getElementById("foodCarbs"),
  addEntryBtn: document.getElementById("addEntryBtn"),

  dailySummary: document.getElementById("dailySummary"),
  entriesList: document.getElementById("entriesList"),

  calendarGrid: document.getElementById("calendarGrid"),
  calendarMonthLabel: document.getElementById("calendarMonthLabel"),
  prevMonthBtn: document.getElementById("prevMonthBtn"),
  nextMonthBtn: document.getElementById("nextMonthBtn"),

  editModal: document.getElementById("editModal"),
  editFoodName: document.getElementById("editFoodName"),
  editFoodCalories: document.getElementById("editFoodCalories"),
  editFoodCarbs: document.getElementById("editFoodCarbs"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  saveEditBtn: document.getElementById("saveEditBtn"),
};

function loadState() {
  const storedTargets = localStorage.getItem(STORAGE_KEYS.targets);
  const storedEntries = localStorage.getItem(STORAGE_KEYS.entries);
  const storedSelectedDate = localStorage.getItem(STORAGE_KEYS.selectedDate);
  const storedCalendarMonth = localStorage.getItem(STORAGE_KEYS.calendarMonth);

  if (storedTargets) state.targetsByDate = JSON.parse(storedTargets);
  if (storedEntries) state.entries = JSON.parse(storedEntries);
  if (storedSelectedDate) state.selectedDate = storedSelectedDate;
  if (storedCalendarMonth) state.calendarMonth = storedCalendarMonth;
}

function saveState() {
  localStorage.setItem(STORAGE_KEYS.targets, JSON.stringify(state.targetsByDate));
  localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(state.entries));
  localStorage.setItem(STORAGE_KEYS.selectedDate, state.selectedDate);
  localStorage.setItem(STORAGE_KEYS.calendarMonth, state.calendarMonth);
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function parseNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getEntriesForDate(date) {
  return state.entries[date] || [];
}

function getTargetsForDate(date) {
  return state.targetsByDate[date] || DEFAULT_TARGETS;
}

function getTotals(date) {
  return getEntriesForDate(date).reduce(
    (acc, item) => {
      acc.calories += parseNum(item.calories);
      acc.carbs += parseNum(item.carbs);
      return acc;
    },
    { calories: 0, carbs: 0 }
  );
}

function getColorStatus(total, target) {
  if (total < target.min) return "below";
  if (total > target.max) return "above";
  return "inrange";
}

function formatMonthLabel(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

function getMonthDays(yyyyMm) {
  const [year, month] = yyyyMm.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  return {
    startDay: firstDay.getDay(),
    daysInMonth: new Date(year, month, 0).getDate(),
    year,
    month,
  };
}

function dateToYMD(date) {
  return date.toISOString().slice(0, 10);
}

function setInputsFromTargets() {
  const targets = getTargetsForDate(state.selectedDate);
  el.calMin.value = targets.calories.min;
  el.calMax.value = targets.calories.max;
  el.carbMin.value = targets.carbs.min;
  el.carbMax.value = targets.carbs.max;
}

function updateSummary() {
  const totals = getTotals(state.selectedDate);
  const targets = getTargetsForDate(state.selectedDate);
  const calStatus = getColorStatus(totals.calories, targets.calories);
  const carbStatus = getColorStatus(totals.carbs, targets.carbs);

  el.dailySummary.innerHTML = `
    <div class="p-3 rounded-xl border border-slate-700 bg-slate-900/60">
      <div class="text-sm text-slate-400">Calories</div>
      <div class="text-lg font-semibold ${calStatus === "below" ? "text-yellow-300" : calStatus === "above" ? "text-red-300" : "text-green-300"}">
        ${totals.calories} / ${targets.calories.min} - ${targets.calories.max}
      </div>
    </div>
    <div class="p-3 rounded-xl border border-slate-700 bg-slate-900/60">
      <div class="text-sm text-slate-400">Carbs (g)</div>
      <div class="text-lg font-semibold ${carbStatus === "below" ? "text-yellow-300" : carbStatus === "above" ? "text-red-300" : "text-green-300"}">
        ${totals.carbs} / ${targets.carbs.min} - ${targets.carbs.max}
      </div>
    </div>
    <div class="p-3 rounded-xl border border-slate-700 bg-slate-900/60 text-sm text-slate-300">
      Selected date: <span class="font-semibold text-white">${state.selectedDate}</span>
    </div>
  `;
}

function updateEntriesList() {
  const items = getEntriesForDate(state.selectedDate);
  if (!items.length) {
    el.entriesList.innerHTML = `<p class="text-slate-400 text-sm">No entries for this day yet.</p>`;
    return;
  }
  el.entriesList.innerHTML = items
    .map(
      (item) => `
        <div class="p-3 rounded-xl border border-slate-700 bg-slate-900/60 flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">${escapeHtml(item.name)}</div>
            <div class="text-sm text-slate-400">${item.calories} cal • ${item.carbs} g carbs</div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button class="btn btn-secondary px-3 py-2 text-sm" data-action="edit" data-id="${item.id}">Edit</button>
            <button class="btn btn-secondary px-3 py-2 text-sm" data-action="delete" data-id="${item.id}">Delete</button>
          </div>
        </div>
      `
    )
    .join("");
}

function updateCalendar() {
  const { startDay, daysInMonth, year, month } = getMonthDays(state.calendarMonth);
  el.calendarMonthLabel.textContent = formatMonthLabel(state.calendarMonth);
  el.calendarGrid.innerHTML = "";

  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day-cell day-empty";
    el.calendarGrid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const ymd = dateToYMD(date);
    const totals = getTotals(ymd);
    const targets = getTargetsForDate(ymd);
    const calStatus = getColorStatus(totals.calories, targets.calories);
    const carbStatus = getColorStatus(totals.carbs, targets.carbs);

    let cellClass = "day-inrange";
    if (calStatus === "above" || carbStatus === "above") cellClass = "day-above";
    else if (calStatus === "below" || carbStatus === "below") cellClass = "day-below";

    const selectedClass = ymd === state.selectedDate ? "day-selected" : "";
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `day-cell text-left ${cellClass} ${selectedClass}`;
    cell.dataset.date = ymd;
    cell.innerHTML = `
      <div class="date">${day}</div>
      <div class="metric">Cal: ${totals.calories}</div>
      <div class="metric">Carbs: ${totals.carbs}g</div>
    `;
    el.calendarGrid.appendChild(cell);
  }
}

function updateUI() {
  setInputsFromTargets();
  el.selectedDate.value = state.selectedDate;
  updateSummary();
  updateEntriesList();
  updateCalendar();
}

function selectDate(dateString) {
  state.selectedDate = dateString;
  if (dateString.slice(0, 7) !== state.calendarMonth) state.calendarMonth = dateString.slice(0, 7);
  saveState();
  updateUI();
}

function addEntry() {
  const name = el.foodName.value.trim();
  const calories = parseNum(el.foodCalories.value);
  const carbs = parseNum(el.foodCarbs.value);
  if (!name) return alert("Please enter a food name.");

  const entry = { id: uid(), name, calories, carbs };
  state.entries[state.selectedDate] ||= [];
  state.entries[state.selectedDate].push(entry);

  el.foodName.value = "";
  el.foodCalories.value = "";
  el.foodCarbs.value = "";
  saveState();
  updateUI();
}

function deleteEntry(date, id) {
  state.entries[date] = (state.entries[date] || []).filter((item) => item.id !== id);
  if (!state.entries[date].length) delete state.entries[date];
  saveState();
  updateUI();
}

function openEditModal(date, id) {
  const item = getEntriesForDate(date).find((x) => x.id === id);
  if (!item) return;
  state.editing = { date, id };
  el.editFoodName.value = item.name;
  el.editFoodCalories.value = item.calories;
  el.editFoodCarbs.value = item.carbs;
  el.editModal.classList.remove("hidden");
  el.editModal.setAttribute("aria-hidden", "false");
}

function closeEditModal() {
  state.editing = null;
  el.editModal.classList.add("hidden");
  el.editModal.setAttribute("aria-hidden", "true");
}

function saveEdit() {
  if (!state.editing) return;
  const { date, id } = state.editing;
  const name = el.editFoodName.value.trim();
  const calories = parseNum(el.editFoodCalories.value);
  const carbs = parseNum(el.editFoodCarbs.value);
  if (!name) return alert("Please enter a food name.");

  const items = getEntriesForDate(date);
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], name, calories, carbs };
  state.entries[date] = items;
  saveState();
  closeEditModal();
  updateUI();
}

function saveTargets() {
  const calMin = parseNum(el.calMin.value);
  const calMax = parseNum(el.calMax.value);
  const carbMin = parseNum(el.carbMin.value);
  const carbMax = parseNum(el.carbMax.value);
  if (calMin > calMax) return alert("Calories min cannot be greater than max.");
  if (carbMin > carbMax) return alert("Carbs min cannot be greater than max.");

  state.targetsByDate[state.selectedDate] = {
    calories: { min: calMin, max: calMax },
    carbs: { min: carbMin, max: carbMax },
  };
  saveState();
  updateUI();
}

function changeMonth(delta) {
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  state.calendarMonth = next.toISOString().slice(0, 7);
  saveState();
  updateCalendar();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

function bindEvents() {
  el.saveTargetsBtn.addEventListener("click", saveTargets);
  el.addEntryBtn.addEventListener("click", addEntry);
  el.todayBtn.addEventListener("click", () => selectDate(dateToYMD(new Date())));
  el.selectedDate.addEventListener("change", (e) => selectDate(e.target.value));
  el.prevMonthBtn.addEventListener("click", () => changeMonth(-1));
  el.nextMonthBtn.addEventListener("click", () => changeMonth(1));
  el.cancelEditBtn.addEventListener("click", closeEditModal);
  el.saveEditBtn.addEventListener("click", saveEdit);
  el.editModal.addEventListener("click", (e) => {
    if (e.target === el.editModal) closeEditModal();
  });

  el.entriesList.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === "edit") openEditModal(state.selectedDate, id);
    if (action === "delete" && confirm("Delete this entry?")) deleteEntry(state.selectedDate, id);
  });

  el.calendarGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-date]");
    if (!btn) return;
    selectDate(btn.dataset.date);
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
  });
}

loadState();
bindEvents();
updateUI();
registerServiceWorker();
