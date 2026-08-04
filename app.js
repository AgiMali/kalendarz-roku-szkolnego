import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const STORAGE_KEY = "school-year-planner-v1";
const firebaseConfig = {
  apiKey: "AIzaSyDAjJV4FhZOJ6G7XRgHVPNcgnncqNhbE1M",
  authDomain: "kalendarz-roku-szkolnego-afebe.firebaseapp.com",
  projectId: "kalendarz-roku-szkolnego-afebe",
  storageBucket: "kalendarz-roku-szkolnego-afebe.firebasestorage.app",
  messagingSenderId: "1072994268353",
  appId: "1:1072994268353:web:eb364cc3846bc39059d040",
};
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
  dayStatusOptions: document.querySelector("#dayStatusOptions"),
  dayStatusLabel: document.querySelector("#dayStatusLabel"),
  dayNotes: document.querySelector("#dayNotes"),
  detailBody: document.querySelector("#detailBody"),
  clearDayButton: document.querySelector("#clearDayButton"),
  clearWeeklyPlanButton: document.querySelector("#clearWeeklyPlanButton"),
  lessonList: document.querySelector("#lessonList"),
  weeklyPlan: document.querySelector("#weeklyPlan"),
  daysRemaining: document.querySelector("#daysRemaining"),
  teachingDaysRemaining: document.querySelector("#teachingDaysRemaining"),
  weekdayStats: document.querySelector("#weekdayStats"),
  subjectStats: document.querySelector("#subjectStats"),
  todayBadge: document.querySelector("#todayBadge"),
  jumpToToday: document.querySelector("#jumpToToday"),
  exportData: document.querySelector("#exportData"),
  importData: document.querySelector("#importData"),
  importFile: document.querySelector("#importFile"),
  dataStatus: document.querySelector("#dataStatus"),
  authFields: document.querySelector("#authFields"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  signInButton: document.querySelector("#signInButton"),
  signUpButton: document.querySelector("#signUpButton"),
  signOutButton: document.querySelector("#signOutButton"),
  authStatus: document.querySelector("#authStatus"),
  syncStatus: document.querySelector("#syncStatus"),
  syncPanel: document.querySelector(".sync-panel"),
  lessonTemplate: document.querySelector("#lessonTemplate"),
};

const today = new Date();
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let state = loadState();
let selectedMonthIndex = 0;
let selectedDateKey = null;
let currentUser = null;
let cloudUnsubscribe = null;
let isApplyingRemoteState = false;
let saveTimeoutId = null;
let calendarRefreshTimeoutId = null;
let pendingRemoteRender = false;
let lastSerializedState = JSON.stringify(state);

init();

function init() {
  populateYearOptions();
  hydrateControls();
  ensureSelectedDate();
  bindEvents();
  render();
  initFirebaseSync();
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
  lastSerializedState = JSON.stringify(state);
  queueCloudSave();
}

function setDataStatus(message, isError = false) {
  if (!elements.dataStatus) {
    return;
  }

  elements.dataStatus.textContent = message;
  elements.dataStatus.classList.toggle("error", isError);
  elements.dataStatus.classList.toggle("success", Boolean(message) && !isError);
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
    if (!selectedDateKey) {
      return;
    }
    const entry = getSelectedEntry();
    entry.notes = elements.dayNotes.value;
    persistEntryWithoutUiRefresh(entry);
    scheduleCalendarOnlyRefresh();
  });

  elements.dayStatusOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button || !selectedDateKey) {
      return;
    }

    const entry = getSelectedEntry();
    entry.dayStatusType = button.dataset.status ?? "";
    state.entries[selectedDateKey] = entry;
    saveState();
    syncStatusChips(entry.dayStatusType);
    renderSummary();
    renderDays();
    renderDayDetails();
  });

  elements.dayStatusLabel.addEventListener("input", () => {
    if (!selectedDateKey) {
      return;
    }
    const entry = getSelectedEntry();
    entry.dayStatusLabel = elements.dayStatusLabel.value;
    persistEntryWithoutUiRefresh(entry);
    scheduleCalendarOnlyRefresh();
  });

  elements.clearDayButton?.addEventListener("click", clearSelectedDay);
  elements.clearWeeklyPlanButton?.addEventListener("click", clearWeeklyPlan);

  elements.jumpToToday.addEventListener("click", goToTodayIfInYear);

  if (elements.exportData) {
    elements.exportData.addEventListener("click", exportPlannerData);
  }

  if (elements.importData && elements.importFile) {
    elements.importData.addEventListener("click", () => elements.importFile.click());
    elements.importFile.addEventListener("change", importPlannerData);
  }

  elements.signInButton?.addEventListener("click", handleSignIn);
  elements.signUpButton?.addEventListener("click", handleSignUp);
  elements.signOutButton?.addEventListener("click", handleSignOut);
}

function render() {
  renderMonths();
  renderWeeklyPlan();
  renderDays();
  renderDayDetails();
  renderSummary();
}

function exportPlannerData() {
  const payload = {
    app: "school-year-planner",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `kalendarz-roku-szkolnego-${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  setDataStatus("Dane zostały zapisane do pliku JSON.");
}

function importPlannerData(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      state = normalizeImportedState(parsed?.state ?? parsed);
      hydrateControls();
      ensureSelectedDate();
      saveState();
      render();
      setDataStatus("Dane zostały wczytane z pliku.");
    } catch (error) {
      setDataStatus("Nie udało się wczytać pliku. Wybierz poprawny eksport kalendarza.", true);
    } finally {
      elements.importFile.value = "";
    }
  };

  reader.readAsText(file, "utf-8");
}

function normalizeImportedState(rawState) {
  return {
    settings: {
      startDate: rawState?.settings?.startDate ?? DEFAULT_START_DATE,
      endDate: rawState?.settings?.endDate ?? DEFAULT_END_DATE,
    },
    entries: rawState?.entries && typeof rawState.entries === "object" ? rawState.entries : {},
    weeklyPlan: normalizeWeeklyPlan(rawState?.weeklyPlan),
  };
}

function getCustomDayStatusInfo(dateKey) {
  const entry = getEntry(dateKey);
  if (!entry.dayStatusType) {
    return null;
  }

  if (entry.dayStatusType === "no-didactic") {
    const label = entry.dayStatusLabel?.trim();
    return {
      name: label || "Wolny od dydaktyki",
      short: label || "wolny",
      type: "no-didactic",
      source: "custom",
    };
  }

  if (entry.dayStatusType === "free-day") {
    const label = entry.dayStatusLabel?.trim();
    return {
      name: label || "Dzień wolny",
      short: label || "wolne",
      type: "free-day",
      source: "custom",
    };
  }

  return null;
}

function initFirebaseSync() {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateAuthUi();

    if (cloudUnsubscribe) {
      cloudUnsubscribe();
      cloudUnsubscribe = null;
    }

    if (!user) {
      setAuthStatus("Dane są teraz zapisywane lokalnie w tej przeglądarce.");
      setSyncStatus("");
      return;
    }

    setAuthStatus(`Zalogowano jako ${user.email}.`);
    await loadCloudStateOrSeed();
    startCloudSubscription();
  });
}

async function handleSignIn() {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    setAuthStatus("Wpisz email i hasło, żeby się zalogować.", true);
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    elements.authPassword.value = "";
    setAuthStatus("Logowanie udane.");
  } catch (error) {
    setAuthStatus(getAuthErrorMessage(error), true);
  }
}

async function handleSignUp() {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;

  if (!email || !password) {
    setAuthStatus("Wpisz email i hasło, żeby założyć konto.", true);
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    elements.authPassword.value = "";
    setAuthStatus("Konto zostało utworzone i od razu Cię zalogowałam.");
  } catch (error) {
    setAuthStatus(getAuthErrorMessage(error), true);
  }
}

async function handleSignOut() {
  await signOut(auth);
  setAuthStatus("Wylogowano. Kalendarz działa dalej lokalnie.");
}

function updateAuthUi() {
  const loggedIn = Boolean(currentUser);
  elements.signOutButton.hidden = !loggedIn;
  elements.signInButton.hidden = loggedIn;
  elements.signUpButton.hidden = loggedIn;
  elements.authEmail.disabled = loggedIn;
  elements.authPassword.disabled = loggedIn;
  elements.authFields.hidden = loggedIn;
  elements.syncPanel.classList.toggle("compact", loggedIn);

  if (loggedIn) {
    elements.authEmail.value = currentUser.email ?? "";
    elements.authPassword.value = "";
  }
}

function setAuthStatus(message, isError = false) {
  if (!elements.authStatus) {
    return;
  }

  elements.authStatus.textContent = message;
  elements.authStatus.classList.toggle("error", isError);
  elements.authStatus.classList.toggle("success", Boolean(message) && !isError);
}

function setSyncStatus(message, isError = false) {
  if (!elements.syncStatus) {
    return;
  }

  elements.syncStatus.textContent = message;
  elements.syncStatus.classList.toggle("error", isError);
  elements.syncStatus.classList.toggle("success", Boolean(message) && !isError);
}

async function loadCloudStateOrSeed() {
  const plannerRef = getPlannerDocRef();
  const snapshot = await getDoc(plannerRef);

  if (!snapshot.exists()) {
    await saveStateToCloud(true);
    setSyncStatus("Utworzyłam Twoją chmurową kopię kalendarza.");
    return;
  }

  const remoteState = snapshot.data()?.state;
  if (!remoteState) {
    await saveStateToCloud(true);
    setSyncStatus("Chmura była pusta, więc wysłałam tam aktualny kalendarz.");
    return;
  }

  applyRemoteState(remoteState);
  setSyncStatus("Wczytałam dane z chmury. Ten sam kalendarz zobaczysz też w szkole.");
}

function startCloudSubscription() {
  const plannerRef = getPlannerDocRef();

  cloudUnsubscribe = onSnapshot(plannerRef, (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    const remoteState = snapshot.data()?.state;
    if (!remoteState) {
      return;
    }

    const serializedRemoteState = JSON.stringify(normalizeImportedState(remoteState));
    if (serializedRemoteState === lastSerializedState) {
      return;
    }

    applyRemoteState(remoteState);
    setSyncStatus("Kalendarz zsynchronizował się z chmurą.");
  });
}

function applyRemoteState(remoteState) {
  const previousDateKey = selectedDateKey;
  const previousMonthIndex = selectedMonthIndex;

  isApplyingRemoteState = true;
  state = normalizeImportedState(remoteState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  lastSerializedState = JSON.stringify(state);
  hydrateControls();

  if (previousDateKey) {
    selectedDateKey = previousDateKey;
    selectedMonthIndex = previousMonthIndex;
  } else {
    ensureSelectedDate();
  }

  if (isEditingPlannerFields()) {
    pendingRemoteRender = true;
    isApplyingRemoteState = false;
    return;
  }

  pendingRemoteRender = false;
  render();
  isApplyingRemoteState = false;
}

function isEditingPlannerFields() {
  const active = document.activeElement;
  if (!active) {
    return false;
  }

  const tag = active.tagName;
  if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
    return false;
  }

  return Boolean(
    active.closest("#detailBody") ||
      active.closest("#weeklyPlan") ||
      active === elements.dayStatusLabel ||
      active === elements.dayNotes,
  );
}

function flushPendingRemoteRender() {
  if (!pendingRemoteRender || isEditingPlannerFields()) {
    return;
  }

  pendingRemoteRender = false;
  render();
}

function queueCloudSave() {
  if (!currentUser || isApplyingRemoteState) {
    return;
  }

  window.clearTimeout(saveTimeoutId);
  setSyncStatus("Zapisywanie zmian do chmury...");
  saveTimeoutId = window.setTimeout(() => {
    saveStateToCloud().catch(() => {
      setSyncStatus("Nie udało się zapisać zmian online. Dane nadal są lokalnie.", true);
    });
  }, 700);
}

async function saveStateToCloud(silent = false) {
  if (!currentUser) {
    return;
  }

  await setDoc(
    getPlannerDocRef(),
    {
      email: currentUser.email ?? "",
      state: normalizeImportedState(state),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (!silent) {
    setSyncStatus("Zmiany zapisane online.");
  }
}

function getPlannerDocRef() {
  return doc(db, "planners", currentUser.uid);
}

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "To konto już istnieje. Zaloguj się tym emailem.";
    case "auth/invalid-email":
      return "Ten email wygląda na niepoprawny.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Nie udało się zalogować. Sprawdź email i hasło.";
    case "auth/weak-password":
      return "Hasło jest za słabe. Użyj dłuższego hasła.";
    case "auth/too-many-requests":
      return "Za dużo prób. Spróbuj ponownie za chwilę.";
    default:
      return "Coś poszło nie tak przy logowaniu. Spróbuj jeszcze raz.";
  }
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
            <button
              class="ghost-button clear-weekday-button"
              type="button"
              data-clear-weekday="${day}"
            >
              Wyczyść
            </button>
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
                  value="${escapeHtml(lesson.group)}"
                >
                <input
                  data-weekly-day="${day}"
                  data-weekly-index="${index}"
                  data-weekly-field="subject"
                  type="text"
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
      scheduleCalendarOnlyRefresh();
    });
  });

  elements.weeklyPlan.querySelectorAll("[data-clear-weekday]").forEach((button) => {
    button.addEventListener("click", () => {
      const day = Number(button.dataset.clearWeekday);
      clearWeeklyPlanDay(day);
    });
  });
}

function clearWeeklyPlanDay(day) {
  state.weeklyPlan[day] = ensureLessonSlots([]);
  saveState();
  renderWeeklyPlan();
  renderSummary();
  renderDays();
  if (selectedDateKey) {
    renderDayDetails();
  }
}

function clearWeeklyPlan() {
  trackedWeekdays.forEach(({ day }) => {
    state.weeklyPlan[day] = ensureLessonSlots([]);
  });
  saveState();
  renderWeeklyPlan();
  renderSummary();
  renderDays();
  if (selectedDateKey) {
    renderDayDetails();
  }
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
      const holidayInfo = getResolvedHolidayInfo(day.date);
      const freeKind = holidayInfo?.type === "no-didactic" ? "no-didactic" : free ? "free-day" : "";
      const freeReason = free && holidayInfo
        ? escapeHtml(holidayInfo.name || holidayInfo.short || "wolne")
        : "";

      return `
        <button
          class="day-button ${selectedDateKey === day.dateKey ? "active" : ""} ${freeKind}"
          type="button"
          data-date-key="${day.dateKey}"
        >
          <span class="day-number">${day.date.getDate()}</span>
          <span class="day-name">${weekdayNames[day.date.getDay()]}</span>
          <div class="day-badges">
            ${free ? "" : lessonSummary.map((item) => `<span class="badge lessons ${getLessonBadgeClass(item.label)}">${item.count} ${escapeHtml(item.label)}</span>`).join("")}
          </div>
          ${freeReason ? `<div class="day-topics"><span class="day-topic free-day-reason">${freeReason}</span></div>` : ""}
          ${notesPreview.length ? `<div class="day-topics">${notesPreview.map((note) => `<span class="day-topic">${escapeHtml(note)}</span>`).join("")}</div>` : ""}
        </button>
      `;
    })
    .join("");

  elements.dayGrid.innerHTML = `${headerMarkup}${placeholderMarkup}${dayMarkup}`;

  elements.dayGrid.querySelectorAll(".day-button").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectedDateKey = button.dataset.dateKey;
      window.clearTimeout(calendarRefreshTimeoutId);
      calendarRefreshTimeoutId = null;
      renderDays();
      renderDayDetails();
    });
  });
}

function syncStatusChips(statusType = "") {
  if (!elements.dayStatusOptions) {
    return;
  }

  elements.dayStatusOptions.querySelectorAll("[data-status]").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === statusType);
  });
}

function clearSelectedDay() {
  if (!selectedDateKey) {
    return;
  }

  delete state.entries[selectedDateKey];
  saveState();
  renderSummary();
  renderDays();
  renderDayDetails();
}

function renderDayDetails() {
  if (!selectedDateKey) {
    elements.detailCard.classList.add("detail-card-empty");
    elements.detailBody.hidden = true;
    if (elements.clearDayButton) {
      elements.clearDayButton.hidden = true;
    }
    elements.selectedDateTitle.textContent = "Szczegóły dnia";
    elements.selectedDateSubtitle.textContent = "Kliknij dzień w kalendarzu, aby wpisać temat lekcji i zaznaczenia.";
    return;
  }

  elements.detailCard.classList.remove("detail-card-empty");
  elements.detailBody.hidden = false;
  if (elements.clearDayButton) {
    elements.clearDayButton.hidden = false;
  }
  const date = parseDateKey(selectedDateKey);
  const entry = getSelectedEntry();
  const lessons = getScheduledLessonsForDate(date);
  const weekdayProgress = getWeekdayProgress(date);

  elements.selectedDateTitle.textContent = formatLongDate(date);
  elements.selectedDateSubtitle.textContent = buildSelectedDateSubtitleResolved(date, weekdayProgress);
  elements.dayStatusLabel.disabled = false;
  elements.dayNotes.disabled = false;
  syncStatusChips(entry.dayStatusType ?? "");

  if (document.activeElement !== elements.dayStatusLabel) {
    elements.dayStatusLabel.value = entry.dayStatusLabel ?? "";
  }
  if (document.activeElement !== elements.dayNotes) {
    elements.dayNotes.value = entry.notes ?? "";
  }
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
        persistEntryWithoutUiRefresh(currentEntry);
        if (field.type !== "checkbox") {
          scheduleCalendarOnlyRefresh();
        }
      });

      if (field.type === "checkbox") {
        field.addEventListener("change", () => {
          const currentEntry = getSelectedEntry();
          const currentLesson = getDayLessonData(currentEntry, index);
          currentLesson[key] = field.checked;
          currentEntry.lessonData[index] = currentLesson;
          persistEntryWithoutUiRefresh(currentEntry);
          renderSummary();
          renderDays();
        });
      }
    });

    elements.lessonList.appendChild(clone);
  });
}

function renderSummary() {
  const startDate = getSchoolYearStart();
  const endDate = getSchoolYearEnd();
  const weekdayCounts = calculateWeekdayCounts(startDate, endDate);
  const classCounts = calculateClassLessonCounts(startDate, endDate);

  elements.daysRemaining.textContent = String(calculateDaysRemaining(startDate, endDate));
  elements.teachingDaysRemaining.textContent = String(calculateTeachingDaysRemaining(startDate, endDate));
  elements.weekdayStats.innerHTML = trackedWeekdays
    .map(({ day, short }) => `<div class="weekday-pill"><strong>${weekdayCounts[day]}</strong><span>${short}</span></div>`)
    .join("");
  elements.subjectStats.innerHTML = classCounts.length
    ? classCounts
      .map(({ label, count, subjectLabel }) => `<div class="subject-pill ${getLessonBadgeClass(subjectLabel)}"><strong>${count}</strong><span>${escapeHtml(label)}</span></div>`)
      .join("")
    : '<p class="subject-empty">Wpisz plan, a tutaj pokażą się godziny dla każdej klasy.</p>';
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

function calculateClassLessonCounts(startDate, endDate) {
  const counts = new Map();
  const pointer = new Date(startDate);

  while (pointer <= endDate) {
    const lessons = getScheduledLessonsForDate(pointer);
    const entry = getEntry(buildDateKey(pointer));

    lessons.forEach((lesson, index) => {
      const dayLesson = getDayLessonData(entry, index);
      if (dayLesson.completed || dayLesson.canceled) {
        return;
      }

      const subjectLabel = getSubjectShortLabel(lesson.subject);
      const groupLabel = normalizeGroupLabel(lesson.group);
      const key = `${groupLabel}__${subjectLabel}`;
      const existing = counts.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          label: `${groupLabel} • ${subjectLabel}`,
          count: 1,
          groupLabel,
          subjectLabel,
        });
      }
    });

    pointer.setDate(pointer.getDate() + 1);
  }

  return Array.from(counts.values()).sort(
    (left, right) =>
      left.groupLabel.localeCompare(right.groupLabel, "pl", { numeric: true }) ||
      left.subjectLabel.localeCompare(right.subjectLabel, "pl") ||
      right.count - left.count,
  );
}

function normalizeGroupLabel(group = "") {
  const cleaned = group.trim();

  if (!cleaned) {
    return "bez klasy";
  }

  return cleaned.replace(/\s+/g, "").toLowerCase();
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

function persistEntryWithoutUiRefresh(entry) {
  if (!selectedDateKey) {
    return;
  }

  state.entries[selectedDateKey] = entry;
  saveState();
}

function scheduleCalendarOnlyRefresh() {
  window.clearTimeout(calendarRefreshTimeoutId);
  calendarRefreshTimeoutId = window.setTimeout(() => {
    renderSummary();
    renderDays();
  }, 350);
}

function refreshUiAfterEdit() {
  window.clearTimeout(calendarRefreshTimeoutId);
  calendarRefreshTimeoutId = null;
  renderSummary();
  renderDays();
  flushPendingRemoteRender();
}

function renderDayDetailsPreservingFocus() {
  renderDayDetails();
}

function scheduleCalendarRefresh() {
  scheduleCalendarOnlyRefresh();
}

function flushCalendarRefresh() {
  refreshUiAfterEdit();
}

function saveEntryQuietly(entry) {
  persistEntryWithoutUiRefresh(entry);
  scheduleCalendarOnlyRefresh();
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
  const targetDate = getTodayDateWithinSchoolYear(current, schoolYearStart, schoolYearEnd);
  const selectedDate = getNearestSelectableDate(targetDate, schoolYearEnd);
  selectedMonthIndex = getMonthIndexForDate(selectedDate);
  selectedDateKey = buildDateKey(selectedDate);
  render();
}

function getTodayDateWithinSchoolYear(current, schoolYearStart, schoolYearEnd) {
  const startYear = schoolYearStart.getFullYear();
  const month = current.getMonth();
  const day = current.getDate();
  const candidateYear = month >= 8 ? startYear : startYear + 1;
  const candidate = new Date(candidateYear, month, day);

  if (candidate >= schoolYearStart && candidate <= schoolYearEnd) {
    return candidate;
  }

  if (current < schoolYearStart) {
    return schoolYearStart;
  }

  if (current > schoolYearEnd) {
    return schoolYearEnd;
  }

  return current;
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
    dayStatusType: saved?.dayStatusType ?? "",
    dayStatusLabel: saved?.dayStatusLabel ?? "",
    notes: saved?.notes ?? "",
    lessonData: saved?.lessonData ?? {},
  };
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isFreeDay(date) {
  return isWeekend(date) || Boolean(getResolvedHolidayInfo(date));
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
    "edukacja komputerowa": "EK",
    "ek": "EK",
    "ai": "AI",
    "sztuczna inteligencja": "AI",
    "zajęcia rozwijające": "ZR",
    "zajecia rozwijajace": "ZR",
    "zr": "ZR",
    "zpt": "ZPT",
    "zajęcia praktyczno-techniczne": "ZPT",
    "zajecia praktyczno-techniczne": "ZPT",
    "technika": "TECH",
    "tech": "TECH",
    "tec": "TECH",
    "majsterkuj z malinką": "MZM",
    "majsterkuj z malinka": "MZM",
    "mzm": "MZM",
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

function getLessonBadgeClass(label = "") {
  const normalized = label.trim().toUpperCase();

  if (normalized === "EK") {
    return "badge-ek";
  }

  if (normalized === "AI") {
    return "badge-ai";
  }

  if (normalized === "INF") {
    return "badge-inf";
  }

  if (normalized === "ZR") {
    return "badge-zr";
  }

  if (normalized === "ZPT") {
    return "badge-zpt";
  }

  if (normalized === "TECH") {
    return "badge-tech";
  }

  if (normalized === "MZM") {
    return "badge-mzm";
  }

  return "badge-default";
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

function buildSelectedDateSubtitleResolved(date, weekdayProgress) {
  if (!weekdayProgress) {
    return "Weekend nie liczy się do dni nauki.";
  }

  const dayName = weekdayNames[date.getDay()].toLowerCase();
  const holidayInfo = getResolvedHolidayInfo(date);

  if (holidayInfo) {
    return holidayInfo.source === "custom"
      ? `${holidayInfo.name}. Ten dzień jest oznaczony jako wolny w Twoim kalendarzu.`
      : `${holidayInfo.name}. Ten dzień jest automatycznie liczony jako wolny.`;
  }

  return `To ${weekdayProgress.order}. ${dayName} roku szkolnego. Po tym dniu zostaje jeszcze ${weekdayProgress.remainingAfter} takich dni nauki.`;
}

function getResolvedHolidayInfo(date) {
  const customDayStatus = getCustomDayStatusInfo(buildDateKey(date));
  if (customDayStatus) {
    return customDayStatus;
  }

  return getHolidayInfo(date);
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
