// ── Data layer ────────────────────────────────────────────────────────────────
let days = {};

async function loadDays() {
  try {
    const res = await fetch("data.json");
    if (res.ok) days = await res.json();
    else {
      console.warn("Could not load data.json — status:", res.status);
      days = {};
    }
  } catch (e) {
    console.warn("Could not load data.json:", e);
    days = {};
  }
}

// ── Calendar state ────────────────────────────────────────────────────────────
const todayDate = new Date();

// Start calendar at April 2026 (project start month)
let calYear = 2026;
let calMonth = 4;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");
const makeKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

let currentDate = null;
let currentPage = "calendar";

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  await loadDays();

  // Restore last page & date from sessionStorage so refresh keeps your place
  const savedPage = sessionStorage.getItem("lastPage");
  const savedDate = sessionStorage.getItem("lastDate");

  if (savedPage === "view" && savedDate) {
    currentDate = savedDate;
    // Set calYear/calMonth to match the saved date so the calendar is correct on back
    const [sy, sm] = savedDate.split("-").map(Number);
    calYear = sy;
    calMonth = sm;
    goPage("view");
  } else {
    goPage("calendar");
  }
})();

// ── Navigation ────────────────────────────────────────────────────────────────
function goPage(page, dateKey) {
  document
    .querySelectorAll(".page")
    .forEach((el) => el.classList.add("hidden"));
  document
    .querySelectorAll(".nav-tab")
    .forEach((el) => el.classList.remove("active"));

  currentPage = page;
  if (dateKey) currentDate = dateKey;

  document.getElementById("page-" + page).classList.remove("hidden");

  const navTarget = document.getElementById(
    page === "project" ? "nav-project" : "nav-calendar",
  );
  if (navTarget) navTarget.classList.add("active");

  // Persist current page & date so refresh/reload returns here
  sessionStorage.setItem("lastPage", page);
  if (currentDate) sessionStorage.setItem("lastDate", currentDate);

  if (page === "calendar") renderCalendar();
  if (page === "view") renderView();
  if (page === "edit") renderEdit();
}

function shiftMonth(d) {
  calMonth += d;
  if (calMonth > 12) {
    calMonth = 1;
    calYear++;
  }
  if (calMonth < 1) {
    calMonth = 12;
    calYear--;
  }
  renderCalendar();
}

// ── Day navigation ────────────────────────────────────────────────────────────
function shiftDay(delta) {
  const [y, m, d] = currentDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);

  // Don't go past today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return;

  // Keep calYear/calMonth in sync so the calendar stays on the right month
  calYear = date.getFullYear();
  calMonth = date.getMonth() + 1;

  currentDate = makeKey(calYear, calMonth, date.getDate());
  goPage("view");
}

// ── Render: Calendar ──────────────────────────────────────────────────────────
function renderCalendar() {
  const today = new Date();
  const total = new Date(calYear, calMonth, 0).getDate();
  const start = new Date(calYear, calMonth - 1, 1).getDay();
  const logged = Object.keys(days).length;
  const monthPfx = calYear + "-" + pad(calMonth);
  const mLogged = Object.keys(days).filter((k) =>
    k.startsWith(monthPfx),
  ).length;

  document.getElementById("stat-total").textContent = logged;
  document.getElementById("stat-month").textContent = mLogged;
  document.getElementById("cal-month-label").textContent =
    MONTHS[calMonth - 1] + " " + calYear;
  document.getElementById("wday-row").innerHTML = WDAYS.map(
    (d) => `<div class="wday-cell">${d}</div>`,
  ).join("");

  let html = "";
  for (let i = 0; i < start; i++) html += "<div></div>";
  for (let day = 1; day <= total; day++) {
    const k = makeKey(calYear, calMonth, day);
    const has = !!days[k];
    const isToday =
      today.getFullYear() === calYear &&
      today.getMonth() + 1 === calMonth &&
      today.getDate() === day;
    let cls = "day-cell";
    if (has) cls += " has-entry";
    if (isToday) cls += " is-today";
    html += `<button class="${cls}" onclick="openDay(${day})">${day}${has ? '<div class="dot"></div>' : ""}</button>`;
  }
  document.getElementById("day-grid").innerHTML = html;
}

function openDay(day) {
  currentDate = makeKey(calYear, calMonth, day);
  goPage("view");
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Only PNG, JPG, and MP4 are used
function isVideo(src) {
  return /\.mp4$/i.test(src);
}

// ── Media grid builder ────────────────────────────────────────────────────────
function buildMediaGrid(evidenceArr) {
  if (!evidenceArr || evidenceArr.length === 0) return "";
  let html = `<div class="media-collage">`;

  evidenceArr.forEach((ph) => {
    if (isVideo(ph.src)) {
      html += `<div class="collage-item">
        <video controls preload="metadata" playsinline>
          <source src="${ph.src}" type="video/mp4">
        </video>
        <div class="collage-video-badge">▶ VIDEO</div>
        <div class="collage-name">${escHtml(ph.name)}</div>
      </div>`;
    } else {
      // PNG / JPG images
      html += `<div class="collage-item" onclick="openLightbox('${ph.src}','${escHtml(ph.name)}')">
        <img src="${ph.src}" alt="${escHtml(ph.name)}" loading="lazy" />
        <div class="collage-name">${escHtml(ph.name)}</div>
      </div>`;
    }
  });

  html += `</div>`;
  return html;
}

// ── Render: View ──────────────────────────────────────────────────────────────
function renderView() {
  const dk = currentDate;
  const [y, m, d] = dk.split("-");
  const label = parseInt(d) + " " + MONTHS[parseInt(m) - 1] + " " + y;
  document.getElementById("view-date-label").textContent = label;

  // Disable next button if we're already on today
  const todayKey = makeKey(
    todayDate.getFullYear(),
    todayDate.getMonth() + 1,
    todayDate.getDate(),
  );
  document.getElementById("btn-next-day").disabled = dk >= todayKey;

  const entry = days[dk];
  if (!entry) {
    document.getElementById("view-empty").classList.remove("hidden");
    document.getElementById("view-content").classList.add("hidden");
    document.getElementById("sidebar-progress-label").textContent =
      "0 / 0 completed";
    document.getElementById("sidebar-progress-bar").style.width = "0%";
    document.getElementById("sidebar-act-summary").innerHTML = "";
    return;
  }
  document.getElementById("view-empty").classList.add("hidden");
  document.getElementById("view-content").classList.remove("hidden");

  const acts = entry.activities || [];
  const total = acts.length;
  const doneCount = acts.filter((a) => a.completed).length;

  // ── Sidebar progress ───────────────────────────────────────────────────────
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById("sidebar-progress-bar").style.width = pct + "%";
  document.getElementById("sidebar-progress-label").textContent =
    `${doneCount} / ${total} completed`;

  // Sidebar activity mini-list
  document.getElementById("sidebar-act-summary").innerHTML = acts
    .map(
      (act) => `
    <div class="sidebar-act-row">
      <div class="sidebar-act-icon ${act.completed ? "icon-done" : "icon-pending"}">
        ${
          act.completed
            ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
        }
      </div>
      <span class="sidebar-act-name">${escHtml(act.name)}</span>
    </div>
  `,
    )
    .join("");

  // ── Activity-by-activity blocks ────────────────────────────────────────────
  if (acts.length === 0) {
    document.getElementById("view-content").innerHTML =
      '<div class="card entry-card"><span class="muted">No activities recorded.</span></div>';
  } else {
    document.getElementById("view-content").innerHTML = acts
      .map((act, i) => {
        const done = act.completed;
        const hasChal = act.challenges && act.challenges.trim();
        const hasEvidence = act.evidence && act.evidence.length > 0;
        const actNum = i + 1;

        return `
        <div class="card act-block ${done ? "act-done" : "act-pending"}">
          <div class="act-block-header">
            <div class="act-block-num">${actNum}</div>
            <div class="act-block-meta">
              <span class="act-name">${escHtml(act.name)}</span>
              <span class="act-badge ${done ? "badge-done" : "badge-pending"}">${done ? "Completed" : "Pending"}</span>
            </div>
            <div class="act-status-icon" title="${done ? "Completed" : "Pending"}">
              ${
                done
                  ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                  : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`
              }
            </div>
          </div>

          ${
            hasChal
              ? `<div class="act-challenge">
            <div class="act-challenge-label"><strong>Challenges</strong></div>
            <span>${escHtml(act.challenges)}</span>
          </div>`
              : ""
          }

          <div class="act-evidence-section">
            <div class="act-evidence-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Evidence
            </div>
            ${
              hasEvidence
                ? buildMediaGrid(act.evidence)
                : `<div class="photo-empty"><span class="muted">No media for this activity.</span></div>`
            }
          </div>
        </div>`;
      })
      .join("");
  }
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(src, alt) {
  document.getElementById("lightbox-img").src = src;
  document.getElementById("lightbox-img").alt = alt;
  document.getElementById("lightbox").style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
  document.body.style.overflow = "";
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
  // Keyboard shortcuts: left/right arrow keys to navigate days on view page
  if (document.getElementById("page-view").classList.contains("hidden")) return;
  if (e.key === "ArrowLeft") shiftDay(-1);
  if (e.key === "ArrowRight") shiftDay(1);
});
