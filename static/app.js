const state = {
  gender: "m",
  view: "athletes",
  meta: null,
  debounce: null,
};

const els = {
  tabs: document.querySelectorAll(".gender-tab"),
  viewBtns: document.querySelectorAll(".view-toggle button"),
  search: document.getElementById("search"),
  division: document.getElementById("division"),
  season: document.getElementById("season"),
  event: document.getElementById("event"),
  school: document.getElementById("school"),
  clear: document.getElementById("clear-filters"),
  exportBtn: document.getElementById("export-btn"),
  resultCount: document.getElementById("result-count"),
  tableHead: document.getElementById("table-head"),
  tableBody: document.getElementById("table-body"),
  loading: document.getElementById("loading"),
};

function selectedValues(select) {
  return Array.from(select.selectedOptions).map((o) => o.value);
}

function buildQuery() {
  const params = new URLSearchParams();
  params.set("gender", state.gender);
  const q = els.search.value.trim();
  if (q) params.set("q", q);
  const div = selectedValues(els.division);
  const season = selectedValues(els.season);
  const ev = selectedValues(els.event);
  const school = selectedValues(els.school);
  if (div.length) params.set("division", div.join(","));
  if (season.length) params.set("season", season.join(","));
  if (ev.length) params.set("event", ev.join(","));
  if (school.length) params.set("school", school.join(","));
  return params;
}

function fillSelect(select, options) {
  const prev = new Set(selectedValues(select));
  select.innerHTML = "";
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    if (prev.has(opt)) el.selected = true;
    select.appendChild(el);
  }
}

function updateFilterOptions() {
  if (!state.meta) return;
  const g = state.meta[state.gender];
  const isMarks = state.view === "marks";
  fillSelect(els.division, isMarks ? g.divisions_marks : g.divisions_athletes);
  fillSelect(els.season, isMarks ? g.seasons_marks : g.seasons_athletes);
  fillSelect(els.event, isMarks ? g.events_marks : g.events_athletes);
  fillSelect(els.school, isMarks ? g.schools_marks : g.schools_athletes);
}

function renderAthletes(rows) {
  els.tableHead.innerHTML = `
    <tr>
      <th>Athlete</th>
      <th>School(s)</th>
      <th>Division(s)</th>
      <th>Season(s)</th>
      <th>Events</th>
      <th># Marks</th>
      <th>Profile</th>
      <th>All times</th>
    </tr>`;
  els.tableBody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td><strong>${esc(r.Athlete)}</strong></td>
      <td>${esc(r["School(s)"])}</td>
      <td>${esc(r["Division(s)"])}</td>
      <td>${esc(r["Season(s)"])}</td>
      <td>${esc(r["Events Met"])}</td>
      <td>${esc(r["# Qualifying Marks"])}</td>
      <td><a class="profile-link" href="${esc(r["TFRRS Profile"])}" target="_blank" rel="noopener">TFRRS</a></td>
      <td class="marks-cell">${esc(r["All Qualifying Times"])}</td>
    </tr>`
    )
    .join("");
}

function renderMarks(rows) {
  els.tableHead.innerHTML = `
    <tr>
      <th>Athlete</th>
      <th>Event</th>
      <th>Time</th>
      <th>School</th>
      <th>Division</th>
      <th>Season</th>
      <th>Meet</th>
      <th>Date</th>
      <th>Profile</th>
    </tr>`;
  els.tableBody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td><strong>${esc(r.Athlete)}</strong></td>
      <td>${esc(r.Event)}</td>
      <td>${esc(r.Time)}</td>
      <td>${esc(r.School)}</td>
      <td>${esc(r.Division)}</td>
      <td>${esc(r.Season)}</td>
      <td>${esc(r.Meet)}</td>
      <td>${esc(r["Meet Date"])}</td>
      <td><a class="profile-link" href="${esc(r["TFRRS Profile"])}" target="_blank" rel="noopener">TFRRS</a></td>
    </tr>`
    )
    .join("");
}

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

async function loadMeta() {
  const res = await fetch("/api/meta");
  state.meta = await res.json();
  for (const tab of els.tabs) {
    const g = tab.dataset.gender;
    const c = state.meta.counts[g];
    tab.querySelector(".count").textContent = `${c.athletes} athletes · ${c.marks} marks`;
  }
  updateFilterOptions();
}

async function loadTable() {
  els.loading.style.display = "block";
  els.tableBody.innerHTML = "";
  const params = buildQuery();
  const endpoint = state.view === "marks" ? "/api/marks" : "/api/athletes";
  const res = await fetch(`${endpoint}?${params}`);
  const data = await res.json();
  els.loading.style.display = "none";

  const label = state.gender === "m" ? "men" : "women";
  const viewLabel = state.view === "marks" ? "marks" : "athletes";
  els.resultCount.textContent = `${data.total.toLocaleString()} ${viewLabel} (${label})`;

  if (!data.rows.length) {
    els.tableBody.innerHTML =
      '<tr><td colspan="9" class="empty">No results match your filters.</td></tr>';
    return;
  }

  if (state.view === "marks") renderMarks(data.rows);
  else renderAthletes(data.rows);
}

function scheduleLoad() {
  clearTimeout(state.debounce);
  state.debounce = setTimeout(loadTable, 200);
}

function exportSheet() {
  const params = buildQuery();
  params.set("view", state.view);
  window.location.href = `/api/export?${params}`;
}

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    els.tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.gender = tab.dataset.gender;
    updateFilterOptions();
    scheduleLoad();
  });
});

els.viewBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    els.viewBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.view = btn.dataset.view;
    updateFilterOptions();
    scheduleLoad();
  });
});

[els.search, els.division, els.season, els.event, els.school].forEach((el) => {
  el.addEventListener("input", scheduleLoad);
  el.addEventListener("change", scheduleLoad);
});

els.clear.addEventListener("click", () => {
  els.search.value = "";
  [els.division, els.season, els.event, els.school].forEach((s) => {
    Array.from(s.options).forEach((o) => (o.selected = false));
  });
  scheduleLoad();
});

els.exportBtn.addEventListener("click", exportSheet);

document.querySelector('.gender-tab[data-gender="m"]').classList.add("active");
document.querySelector('.view-toggle button[data-view="athletes"]').classList.add("active");

loadMeta().then(loadTable);
