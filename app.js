const STORAGE_KEY = "school-year-planner-v1";
const monthNames = [
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
];
const calendarMonths = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const weekdayNames = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const trackedWeekdays = [
  { day: 1, short: "Pon.", label: "poniedziałków" },
  { day: 2, short: "Wt.", label: "wtorków" },
  { day: 3, short: "Śr.", label: "śród" },
  { day: 4, short: "Czw.", label: "czwartków" },
  { day: 5, short: "Pt.", label: "piątków" },
];
const DEFAULT_START_DATE = "2026-09-01";
const DEFAULT_END_DATE = "2027-06-25";
const DEFAULT_LESSON_SLOTS = 8;

const elements = {
  schoolYearStartDate: document.querySelector("#schoolYearStartDate"),
  schoolYearEnd: document.querySelector("#schoolYearEnd"),
  monthGrid: document.querySelector("#monthGrid"),
  dayGrid: document.querySelector("#dayGrid"),
  monthTitle: document.querySelector("#monthTitle"),
  monthMeta: document.querySelector("#monthMeta"),
  detailCard: document.querySelector("#detailCard"),
  selectedDateTitle: document.querySelector("#selectedDateTitle"),
  selectedDateSubtitle: document.querySelector("#selectedDateSubtitle"),
  dayNotes: document.querySelector("#dayNotes"),
  lessonList: document.querySelector("#lessonList"),
  weeklyPlan: document.querySelector("#weeklyPlan"),
  daysRemaining: document.querySelector("#daysRemaining"),
  teachingDaysRemaining: document.querySelector("#teachingDaysRemaining"),
  weekdayStats: document.querySelector("#weekdayStats"),
  todayBadge: document.querySelector("#todayBadge"),
  jumpToToday: document.querySelector("#jumpToToday"),
  lessonTemplate: document.querySelector("#lessonTemplate"),
};

const today = new Date();

let state = loadState();
let selectedMonthIndex = 0;
let selectedDateKey = null;

init();

function init() {
  populateYearOptions();
  hydrateControls();
  ensureSelectedDate();
  bindEvents();
  render();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      settings: {
        startDate: parsed.settings?.startDate ?? DEFAULT_START_DATE,
        endDate: parsed.settings?.endDate ?? DEFAULT_END_DATE,
      },
      entries: parsed.entries ?? {},
      weeklyPlan: normalizeWeeklyPlan(parsed.weeklyPlan),
    };
  }

  return {
    settings: {
      startDate: DEFAULT_START_DATE,
      endDate: DEFAULT_END_DATE,
    },
    entries: {},
    weeklyPlan: normalizeWeeklyPlan(),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function populateYearOptions() {
}

function hydrateControls() {
  elements.schoolYearStartDate.value = state.settings.startDate;
  elements.schoolYearEnd.value = state.settings.endDate;
}

function bindEvents() {
  elements.schoolYearStartDate.addEventListener("change", () => {
    state.settings.startDate = elements.schoolYearStartDate.value || DEFAULT_START_DATE;
    selectedMonthIndex = 0;
    selectedDateKey = null;
    saveState();
    render();
  });

  elements.schoolYearEnd.addEventListener("change", () => {
    state.settings.endDate = elements.schoolYearEnd.value;
    saveState();
    render();
  });

  elements.dayNotes.addEventListener("input", () => {
    const entry = getSelectedEntry();
    entry.notes = elements.dayNotes.value;
    saveSelectedEntry(entry, false);
  });

  elements.jumpToToday.addEventListener("click", goToTodayIfInYear);
}

function render() {
  renderMonths();
  renderWeeklyPlan();
  renderDays();
  renderDayDetails();
  renderSummary();
}

function renderMonths() {
  const startYear = getSchoolYearStart().getFullYear();

  elements.monthGrid.innerHTML = calendarMonths
    .map((month, index) => {
      const year = month >= 8 ? startYear : startYear + 1;
      const days = getDaysForMonth(year, month);
      const lessonCount = days.reduce((total, day) => total + getScheduledLessonsForDate(day.date).length, 0);
      const canceledLessons = days.reduce((total, day) => {
        const entry = getEntry(day.dateKey);
        return total + Object.values(entry.lessonData).filter((lesson) => lesson.canceled).length;
      }, 0);

      return `
        <button class="month-button ${index === selectedMonthIndex ? "active" : ""}" type="button" data-month-index="${index}">
          <span class="month-name">${monthNames[index]}</span>
          <span class="month-meta">${year}</span>
          <span class="month-meta">${lessonCount} lekcji, ${canceledLessons} nieodbytych</span>
        </button>
      `;
    })
    .join("");

  elements.monthGrid.querySelectorAll(".month-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMonthIndex = Number(button.dataset.monthIndex);
      selectedDateKey = null;
      render();
    });
  });
}

function renderWeeklyPlan() {
  const startDate = getSchoolYearStart();
  const endDate = getSchoolYearEnd();
  trackedWeekdays.forEach(({ day }) => {
    state.weeklyPlan[day] = ensureLessonSlots(state.weeklyPlan[day]);
  });

  elements.weeklyPlan.innerHTML = `
    <div class="weekly-plan-grid">
      <div class="weekly-plan-grid-head corner">Nr</div>
      ${trackedWeekdays
        .map(({ day, short }) => `
          <div class="weekly-plan-grid-head">
            <strong>${short}</strong>
            <span>${countRemainingOccurrences(day, startDate, endDate)}</span>
          </div>
        `)
        .join("")}
      ${Array.from({ length: DEFAULT_LESSON_SLOTS }, (_, index) => `
        <div class="weekly-plan-slot">${index + 1}.</div>
        ${trackedWeekdays
          .map(({ day }) => {
            const lesson = state.weeklyPlan[day][index];
            return `
              <div class="weekly-plan-cell">
                <input
                  data-weekly-day="${day}"
                  data-weekly-index="${index}"
                  data-weekly-field="group"
                  type="text"
                  placeholder="klasa"
                  value="${escapeHtml(lesson.group)}"
                >
                <input
                  data-weekly-day="${day}"
                  data-weekly-index="${index}"
                  data-weekly-field="subject"
                  type="text"
                  placeholder="przedmiot"
                  value="${escapeHtml(lesson.subject)}"
                >
              </div>
            `;
          })
          .join("")}
      `).join("")}
    </div>
  `;

  elements.weeklyPlan.querySelectorAll("[data-weekly-field]").forEach((field) => {
    field.addEventListener("input", () => {
      const day = Number(field.dataset.weeklyDay);
      const index = Number(field.dataset.weeklyIndex);
      const key = field.dataset.weeklyField;
      state.weeklyPlan[day][index][key] = field.value;
      saveState();
      renderSummary();
      renderDays();
      if (selectedDateKey && parseDateKey(selectedDateKey).getDay() === day) {
        renderDayDetails();
      }
    });
  });
}

function renderDays() {
  const monthDate = getMonthDateByIndex(selectedMonthIndex);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const weekdaysOnly = getDaysForMonth(year, month).filter((day) => !isWeekend(day.date));
  const headers = ["Pn", "Wt", "Śr", "Czw", "Pt"];
  const firstDay = weekdaysOnly[0]?.date;
  const firstWeekdayIndex = firstDay ? Math.max(0, firstDay.getDay() - 1) : 0;

  elements.monthTitle.textContent = `${monthNames[selectedMonthIndex]} ${year}`;
  elements.monthMeta.textContent = `Kliknij dzień, aby wpisać lekcje, tematy i notatki.`;

  const headerMarkup = headers.map((label) => `<div class="weekday-header">${label}</div>`).join("");
  const placeholderMarkup = Array.from({ length: firstWeekdayIndex }, () => '<div class="day-placeholder"></div>').join("");
  const dayMarkup = weekdaysOnly
    .map((day) => {
      const free = isFreeDay(day.date);
      const lessonSummary = getLessonSummaryForDate(day.date);
      const notesPreview = getCalendarNotePreview(day.dateKey);
      const holidayInfo = getHolidayInfo(day.date);

      return `
        <button
          class="day-button ${selectedDateKey === day.dateKey ? "active" : ""} ${free ? "free-day" : ""}"
          type="button"
          data-date-key="${day.dateKey}"
        >
          <span class="day-number">${day.date.getDate()}</span>
          <span class="day-name">${weekdayNames[day.date.getDay()]}</span>
          <div class="day-badges">
            ${free ? "" : lessonSummary.map((item) => `<span class="badge lessons">${item.count} ${escapeHtml(item.label)}</span>`).join("")}
            ${free ? `<span class="badge free">${holidayInfo ? holidayInfo.short : "wolne"}</span>` : ""}
          </div>
          ${notesPreview.length ? `<div class="day-topics">${notesPreview.map((note) => `<span class="day-topic">${note}</span>`).join("")}</div>` : ""}
        </button>
      `;
    })
    .join("");

  elements.dayGrid.innerHTML = `${headerMarkup}${placeholderMarkup}${dayMarkup}`;

  elements.dayGrid.querySelectorAll(".day-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDateKey = button.dataset.dateKey;
      renderDays();
      renderDayDetails();
    });
  });
}

function renderDayDetails() {
  if (!selectedDateKey) {
    elements.detailCard.classList.add("detail-card-empty");
    elements.selectedDateTitle.textContent = "Szczegóły dnia";
    elements.selectedDateSubtitle.textContent = "Kliknij dzień w kalendarzu, aby wpisać temat lekcji i zaznaczenia.";
    elements.dayNotes.value = "";
    elements.dayNotes.disabled = true;
    elements.lessonList.innerHTML = '<p class="empty-state">Po wybraniu dnia pokażą się tutaj lekcje z planu i pola do wpisania tematu.</p>';
    return;
  }

  elements.detailCard.classList.remove("detail-card-empty");
  const date = parseDateKey(selectedDateKey);
  const entry = getSelectedEntry();
  const lessons = getScheduledLessonsForDate(date);
  const weekdayProgress = getWeekdayProgress(date);

  elements.selectedDateTitle.textContent = formatLongDate(date);
  elements.selectedDateSubtitle.textContent = buildSelectedDateSubtitle(date, weekdayProgress);
  elements.dayNotes.disabled = false;
  elements.dayNotes.value = entry.notes ?? "";
  elements.lessonList.innerHTML = "";

  if (!lessons.length) {
    elements.lessonList.innerHTML = '<p class="empty-state">Na ten dzień nie ma lekcji w stałym planie. Możesz zostawić notatkę albo oznaczyć wyjątek.</p>';
    return;
  }

  elements.lessonList.classList.add("compact-lessons");

  lessons.forEach((lesson, index) => {
    const clone = elements.lessonTemplate.content.firstElementChild.cloneNode(true);
    clone.querySelector(".lesson-number").textContent = `Lekcja ${index + 1}`;
    clone.querySelector(".lesson-label").textContent = `${lesson.subject || "Bez przedmiotu"}${lesson.group ? ` • ${lesson.group}` : ""}`;
    const dayLesson = getDayLessonData(entry, index);

    clone.querySelectorAll("[data-field]").forEach((field) => {
      const key = field.dataset.field;
      if (field.type === "checkbox") {
        field.checked = Boolean(dayLesson[key]);
      } else {
        field.value = dayLesson[key] ?? "";
      }

      field.addEventListener("input", () => {
        const currentEntry = getSelectedEntry();
        const currentLesson = getDayLessonData(currentEntry, index);
        currentLesson[key] = field.type === "checkbox" ? field.checked : field.value;
        currentEntry.lessonData[index] = currentLesson;
        saveSelectedEntry(currentEntry, false);
      });
    });

    elements.lessonList.appendChild(clone);
  });
}

function renderSummary() {
  const startDate = getSchoolYearStart();
  const endDate = getSchoolYearEnd();
  const weekdayCounts = calculateWeekdayCounts(startDate, endDate);

  elements.daysRemaining.textContent = String(calculateDaysRemaining(startDate, endDate));
  elements.teachingDaysRemaining.textContent = String(calculateTeachingDaysRemaining(startDate, endDate));
  elements.weekdayStats.innerHTML = trackedWeekdays
    .map(({ day, short }) => `<div class="weekday-pill"><strong>${weekdayCounts[day]}</strong><span>${short}</span></div>`)
    .join("");
  elements.todayBadge.textContent = `Liczenie od: ${formatLongDate(startDate)}`;
}

function calculateDaysRemaining(startDate, endDate) {
  if (startDate > endDate) {
    return 0;
  }

  return Math.floor((endDate - startDate) / 86400000) + 1;
}

function calculateTeachingDaysRemaining(startDate, endDate) {
  let count = 0;
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    if (!isFreeDay(pointer)) {
      count += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return count;
}

function calculateLessonsRemaining(startDate, endDate) {
  let count = 0;
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    const lessons = getScheduledLessonsForDate(pointer);
    const entry = getEntry(buildDateKey(pointer));
    count += lessons.filter((_, index) => {
      const dayLesson = getDayLessonData(entry, index);
      return !dayLesson.completed && !dayLesson.canceled;
    }).length;
    pointer.setDate(pointer.getDate() + 1);
  }

  return count;
}

function calculateWeekdayCounts(startDate, endDate) {
  const counts = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    const day = pointer.getDay();
    if (counts[day] !== undefined && !isFreeDay(pointer)) {
      counts[day] += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return counts;
}

function saveSelectedEntry(entry, rerender = true) {
  state.entries[selectedDateKey] = entry;
  saveState();

  if (rerender) {
    render();
  } else {
    renderSummary();
    renderDays();
  }
}

function ensureSelectedDate() {
  const current = stripTime(today);
  const schoolYearStart = getSchoolYearStart();
  const schoolYearEnd = getSchoolYearEnd();

  if (current >= schoolYearStart && current <= schoolYearEnd) {
    selectedMonthIndex = getMonthIndexForDate(current);
    selectedDateKey = null;
    return;
  }

  selectedMonthIndex = 0;
  selectedDateKey = null;
}

function goToTodayIfInYear() {
  const current = stripTime(today);
  const schoolYearStart = getSchoolYearStart();
  const schoolYearEnd = getSchoolYearEnd();

  if (current < schoolYearStart || current > schoolYearEnd) {
    return;
  }

  const selectedDate = getNearestSelectableDate(current, schoolYearEnd);
  selectedMonthIndex = getMonthIndexForDate(selectedDate);
  selectedDateKey = buildDateKey(selectedDate);
  render();
}

function getMonthIndexForDate(date) {
  return calendarMonths.indexOf(date.getMonth());
}

function getMonthDateByIndex(index) {
  const month = calendarMonths[index];
  const startYear = getSchoolYearStart().getFullYear();
  const year = month >= 8 ? startYear : startYear + 1;
  return new Date(year, month, 1);
}

function getDaysForMonth(year, month) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const days = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month, day);
    days.push({
      date,
      dateKey: buildDateKey(date),
    });
  }

  return days;
}

function getSelectedEntry() {
  return getEntry(selectedDateKey);
}

function getEntry(dateKey) {
  const saved = state.entries[dateKey];
  return {
    notes: saved?.notes ?? "",
    lessonData: saved?.lessonData ?? {},
  };
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isFreeDay(date) {
  return isWeekend(date) || Boolean(getHolidayInfo(date));
}

function createWeeklyLesson() {
  return {
    subject: "",
    group: "",
  };
}

function normalizeWeeklyPlan(plan = {}) {
  return {
    1: ensureLessonSlots(Array.isArray(plan[1]) ? plan[1] : []),
    2: ensureLessonSlots(Array.isArray(plan[2]) ? plan[2] : []),
    3: ensureLessonSlots(Array.isArray(plan[3]) ? plan[3] : []),
    4: ensureLessonSlots(Array.isArray(plan[4]) ? plan[4] : []),
    5: ensureLessonSlots(Array.isArray(plan[5]) ? plan[5] : []),
  };
}

function getScheduledLessonsForDate(date) {
  if (isWeekend(date)) {
    return [];
  }

  const weekday = date.getDay();
  if (weekday < 1 || weekday > 5 || isFreeDay(date)) {
    return [];
  }

  return state.weeklyPlan[weekday].filter((lesson) => lesson.subject.trim() || lesson.group.trim());
}

function getLessonSummaryForDate(date) {
  const groupedLessons = new Map();

  getScheduledLessonsForDate(date).forEach((lesson) => {
    const subject = lesson.subject.trim();
    const label = getSubjectShortLabel(subject);
    const existing = groupedLessons.get(label);

    if (existing) {
      existing.count += 1;
      return;
    }

    groupedLessons.set(label, {
      label,
      count: 1,
      sortLabel: subject || label,
    });
  });

  return Array.from(groupedLessons.values()).sort((left, right) => left.sortLabel.localeCompare(right.sortLabel, "pl"));
}

function getSubjectShortLabel(subject = "") {
  const normalized = subject.trim().toLowerCase();
  const shortcuts = {
    "informatyka": "INF",
    "inf": "INF",
    "zpt": "ZPT",
    "zajęcia praktyczno-techniczne": "ZPT",
    "zajecia praktyczno-techniczne": "ZPT",
    "technika": "TECH",
    "tech": "TECH",
  };

  if (!normalized) {
    return "LEK";
  }

  if (shortcuts[normalized]) {
    return shortcuts[normalized];
  }

  const cleaned = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
  }

  return cleaned.slice(0, 4).toUpperCase() || "LEK";
}

function getDayLessonData(entry, index) {
  return entry.lessonData[index] ?? {
    topic: "",
    notes: "",
    completed: false,
    canceled: false,
    canceledReason: "",
  };
}

function getCalendarNotePreview(dateKey) {
  const entry = getEntry(dateKey);
  return String(entry.notes || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function ensureLessonSlots(lessons = []) {
  const normalized = lessons.map((lesson) => ({
    subject: lesson?.subject ?? "",
    group: lesson?.group ?? "",
  }));

  while (normalized.length < DEFAULT_LESSON_SLOTS) {
    normalized.push(createWeeklyLesson());
  }

  return normalized.slice(0, DEFAULT_LESSON_SLOTS);
}

function countRemainingOccurrences(weekday, startDate, endDate) {
  let count = 0;
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    if (pointer.getDay() === weekday && !isFreeDay(pointer)) {
      count += 1;
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return count;
}

function getWeekdayProgress(date) {
  const day = date.getDay();
  if (day < 1 || day > 5) {
    return null;
  }

  const start = getSchoolYearStart();
  const end = getSchoolYearEnd();
  let order = 0;
  let remainingAfter = 0;
  const pointer = new Date(start);

  while (pointer <= end) {
    if (pointer.getDay() === day && !isFreeDay(pointer)) {
      order += 1;

      if (buildDateKey(pointer) === buildDateKey(date)) {
        const afterPointer = new Date(pointer);
        afterPointer.setDate(afterPointer.getDate() + 1);
        remainingAfter = countRemainingOccurrences(day, afterPointer, end);
        return { order, remainingAfter };
      }
    }
    pointer.setDate(pointer.getDate() + 1);
  }

  return { order: 0, remainingAfter: countRemainingOccurrences(day, date, end) };
}

function buildSelectedDateSubtitle(date, weekdayProgress) {
  if (!weekdayProgress) {
    return "Weekend nie liczy się do dni nauki.";
  }

  const dayName = weekdayNames[date.getDay()].toLowerCase();
  const holidayInfo = getHolidayInfo(date);

  if (holidayInfo) {
    return `${holidayInfo.name}. Ten dzień jest automatycznie liczony jako wolny.`;
  }

  return `To ${weekdayProgress.order}. ${dayName} roku szkolnego. Po tym dniu zostaje jeszcze ${weekdayProgress.remainingAfter} takich dni nauki.`;
}

function getNearestSelectableDate(startDate, limitDate) {
  const pointer = new Date(startDate);

  while (pointer <= limitDate && isWeekend(pointer)) {
    pointer.setDate(pointer.getDate() + 1);
  }

  return pointer <= limitDate ? pointer : startDate;
}

function getSchoolYearStart() {
  return stripTime(parseDateKey(state.settings.startDate));
}

function getSchoolYearEnd() {
  return stripTime(parseDateKey(state.settings.endDate));
}

function getHolidayInfo(date) {
  const key = buildDateKey(date);
  const schoolYearStart = getSchoolYearStart();
  const schoolYearEnd = getSchoolYearEnd();
  const startYear = schoolYearStart.getFullYear();
  const holidayMap = {
    [buildDateKey(schoolYearStart)]: { name: "Rozpoczęcie roku szkolnego", short: "start" },
    [buildDateKey(schoolYearEnd)]: { name: "Zakończenie roku szkolnego", short: "koniec" },
    [`${startYear}-11-11`]: { name: "Narodowe Święto Niepodległości", short: "11 XI" },
    [`${startYear}-12-25`]: { name: "Boże Narodzenie", short: "święto" },
    [`${startYear}-12-26`]: { name: "Drugi dzień Bożego Narodzenia", short: "święto" },
    [`${startYear + 1}-01-01`]: { name: "Nowy Rok", short: "święto" },
    [`${startYear + 1}-01-06`]: { name: "Trzech Króli", short: "święto" },
    [`${startYear + 1}-05-01`]: { name: "Święto Pracy", short: "święto" },
    [`${startYear + 1}-05-03`]: { name: "Święto Konstytucji 3 Maja", short: "3 V" },
  };

  const easter = getEasterSunday(startYear + 1);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easterMonday.getDate() + 1);
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(corpusChristi.getDate() + 60);

  holidayMap[buildDateKey(easterMonday)] = { name: "Poniedziałek Wielkanocny", short: "święto" };
  holidayMap[buildDateKey(corpusChristi)] = { name: "Boże Ciało", short: "święto" };

  addHolidayRange(holidayMap, "2026-12-25", "2026-12-31", "Przerwa świąteczna", "święta");
  addHolidayRange(holidayMap, "2027-01-18", "2027-01-31", "Ferie zimowe", "ferie");
  addHolidayRange(holidayMap, "2027-03-25", "2027-03-30", "Przerwa wielkanocna", "Wlk");
  holidayMap["2027-06-25"] = { name: "Zakończenie roku szkolnego", short: "koniec" };

  return holidayMap[key] ?? null;
}

function addHolidayRange(holidayMap, startKey, endKey, name, short) {
  const pointer = parseDateKey(startKey);
  const endDate = parseDateKey(endKey);

  while (pointer <= endDate) {
    holidayMap[buildDateKey(pointer)] = { name, short };
    pointer.setDate(pointer.getDate() + 1);
  }
}

function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildDateKey(date) {
  const localDate = stripTime(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
