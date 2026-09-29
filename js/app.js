import { assemble } from "./aggregate.js";
import { lineChart } from "./charts.js";
import { exportBasename, toCsv } from "./csv.js";
import { compass, escapeHtml, fmt, isTimeZone, parseCoord, weatherText } from "./format.js";
import { mapsEmbedUrl, mapsOpenUrl } from "./map.js";
import { archiveUrl, fetchEndpoint, fetchMarine, forecastUrl, geocodeUrl, marineUrl, parseGeocode } from "./openmeteo.js";
import { reportHtml } from "./report.js";
import { addCalendarDays, formatYmd } from "./window.js";
const CACHE_KEY = "weathermeter:last";
const FORM_KEY = "weathermeter:form";
const THEME_KEY = "weathermeter:theme";
const state = {
    snapshot: null,
    stale: false,
    exportReady: false,
    selected: "",
    filter: "all",
    sort: "date",
};
function byId(id) {
    const node = document.getElementById(id);
    if (!node)
        throw new Error(`Missing #${id}`);
    return node;
}
function setStatus(text) {
    byId("status").textContent = text;
}
function siteClass(value) {
    if (value === "onshore" || value === "nearest")
        return value;
    return "offshore";
}
function readForm() {
    const lat = parseCoord(byId("site-lat").value, "lat");
    const lon = parseCoord(byId("site-lon").value, "lon");
    const timezone = byId("timezone").value.trim();
    if (lat === null)
        return { error: "Latitude must be a decimal between -90 and 90. South is negative." };
    if (lon === null)
        return { error: "Longitude must be a decimal between -180 and 180. West is negative." };
    if (!isTimeZone(timezone))
        return { error: "Timezone must be an IANA name, such as America/Sao_Paulo." };
    return {
        lat,
        lon,
        timezone,
        site: siteClass(byId("site-class").value),
        name: byId("site-name").value.trim(),
    };
}
function saveForm() {
    const form = {
        name: byId("site-name").value,
        lat: byId("site-lat").value,
        lon: byId("site-lon").value,
        site: siteClass(byId("site-class").value),
        timezone: byId("timezone").value,
        preset: byId("preset").value,
    };
    localStorage.setItem(FORM_KEY, JSON.stringify(form));
}
function restoreForm() {
    const raw = localStorage.getItem(FORM_KEY);
    if (!raw)
        return;
    try {
        const form = JSON.parse(raw);
        byId("site-name").value = form.name ?? "";
        byId("site-lat").value = form.lat ?? "-20.04";
        byId("site-lon").value = form.lon ?? "-39.52";
        byId("site-class").value = form.site ?? "offshore";
        byId("timezone").value = form.timezone ?? "America/Sao_Paulo";
        const preset = form.preset === "offshore" || form.preset === "custom" ? form.preset : "custom";
        byId("preset").value = preset;
    }
    catch {
        /* ignore a damaged saved form */
    }
}
function refreshMap() {
    const lat = parseCoord(byId("site-lat").value, "lat");
    const lon = parseCoord(byId("site-lon").value, "lon");
    if (lat === null || lon === null)
        return;
    const embed = mapsEmbedUrl(lat, lon);
    const open = mapsOpenUrl(lat, lon);
    const iframe = byId("site-map");
    const link = byId("gmaps-open");
    const name = byId("site-name").value.trim() || "the site";
    if (embed && iframe.getAttribute("src") !== embed) {
        iframe.src = embed;
        iframe.title = `Google Map of ${name}`;
    }
    if (open)
        link.href = open;
}
function markDirty() {
    state.exportReady = false;
    byId("export-csv").disabled = true;
    byId("export-pdf").disabled = true;
    saveForm();
    refreshMap();
}
function applyPreset() {
    const preset = byId("preset").value;
    if (preset === "offshore") {
        byId("site-lat").value = "-20.04";
        byId("site-lon").value = "-39.52";
        byId("site-class").value = "offshore";
        byId("site-name").value = "Offshore default";
    }
    markDirty();
}
function kindLabel(kind) {
    if (kind === "archived-forecast")
        return "Archived forecast";
    if (kind === "reanalysis")
        return "Reanalysis";
    if (kind === "forecast")
        return "Forecast";
    if (kind === "marine-forecast")
        return "Marine forecast";
    if (kind === "archived-marine-forecast")
        return "Archived marine forecast";
    return "Unavailable";
}
function visibleDays(snapshot) {
    const rows = snapshot.days.filter((row) => {
        if (state.filter === "past")
            return row.period === "past";
        if (state.filter === "today")
            return row.period === "today";
        if (state.filter === "forecast")
            return row.period === "today" || row.period === "future";
        return true;
    });
    const keyed = (row) => {
        if (state.sort === "rain")
            return row.rainMm;
        if (state.sort === "cloud")
            return row.cloudMean;
        if (state.sort === "wind")
            return row.gustKt;
        if (state.sort === "swell")
            return row.swellM;
        if (state.sort === "wave")
            return row.waveM;
        return null;
    };
    if (state.sort === "date")
        return rows;
    return rows.slice().sort((a, b) => {
        const av = keyed(a);
        const bv = keyed(b);
        if (av === null && bv === null)
            return a.date < b.date ? -1 : 1;
        if (av === null)
            return 1;
        if (bv === null)
            return -1;
        return bv - av || (a.date < b.date ? -1 : 1);
    });
}
function renderCharts(snapshot) {
    const days = snapshot.days;
    const cards = [
        ["Temperature max °C", days.map((row) => row.tempMax)],
        ["Rain mm", days.map((row) => row.rainMm)],
        ["Cloud %", days.map((row) => row.cloudMean)],
        ["Gust kt", days.map((row) => row.gustKt)],
        ["Swell m", days.map((row) => row.swellM)],
        ["Total wave m", days.map((row) => row.waveM)],
    ];
    byId("charts").innerHTML = cards
        .map(([label, values]) => `<figure><figcaption>${escapeHtml(label)}</figcaption>${lineChart(values, label)}</figure>`)
        .join("");
}
function render(snapshot) {
    const today = snapshot.days.find((row) => row.period === "today");
    const weather = snapshot.weatherGrid;
    const marine = snapshot.marineGrid;
    byId("fetched").textContent = snapshot.fetchedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC");
    byId("stale").hidden = !state.stale;
    byId("stale").textContent = state.stale
        ? `Showing the saved lookup from ${snapshot.fetchedAt}. The latest request did not replace it.`
        : "";
    const measure = (label, value, digits, unit) => value === null ? `${label} Unavailable` : `${label} ${fmt(value, digits)} ${unit}`;
    const bits = today
        ? [
            today.tempMin === null || today.tempMax === null
                ? "Temp Unavailable"
                : `Temp ${fmt(today.tempMin, 1)}–${fmt(today.tempMax, 1)} °C`,
            measure("Rain", today.rainMm, 1, "mm"),
            today.cloudMean === null ? "Cloud Unavailable" : `Cloud ${fmt(today.cloudMean, 0)}%`,
            measure("Gust", today.gustKt, 1, "kt"),
            measure("Swell", today.swellM, 2, "m"),
            measure("Wave", today.waveM, 2, "m"),
            today.conditions.length ? today.conditions.join("; ") : "none flagged",
        ]
        : ["Today is outside the loaded window."];
    byId("today-strip").textContent = bits.join(" · ");
    const grid = [
        weather ? `Weather cell ${weather.lat.toFixed(3)}, ${weather.lon.toFixed(3)}` : "Weather cell Unavailable",
        weather && weather.elevation !== null ? `elevation ${weather.elevation} m` : "",
        marine ? `Marine cell ${marine.lat.toFixed(3)}, ${marine.lon.toFixed(3)}` : `Marine cell Unavailable${snapshot.marineError ? `: ${snapshot.marineError}` : ""}`,
    ].filter(Boolean);
    byId("grid-note").textContent = grid.join(" · ");
    const archive = byId("archive-note");
    archive.hidden = !snapshot.archiveError;
    archive.textContent = snapshot.archiveError ? `Reanalysis unavailable: ${snapshot.archiveError}` : "";
    const body = visibleDays(snapshot).map((row) => {
        const selected = row.date === state.selected ? " selected" : "";
        const humidity = row.humidityMean === null ? "Unavailable" : `${fmt(row.humidityMean, 0)}${row.humidityCalculated ? "*" : ""}`;
        const conditions = row.conditions.length ? row.conditions.join("; ") : "none flagged";
        return `<tr class="${escapeHtml(row.period)}${selected}" data-date="${escapeHtml(row.date)}">
      <td>${escapeHtml(row.date)}</td>
      <td>${escapeHtml(row.period)}</td>
      <td>${escapeHtml(kindLabel(row.weatherKind))}</td>
      <td>${escapeHtml(fmt(row.tempMin, 1))}</td>
      <td>${escapeHtml(fmt(row.tempMax, 1))}</td>
      <td>${escapeHtml(humidity)}</td>
      <td>${escapeHtml(fmt(row.precipMm, 1))}</td>
      <td>${escapeHtml(fmt(row.rainMm, 1))}</td>
      <td>${escapeHtml(fmt(row.cloudMean, 0))}</td>
      <td>${escapeHtml(fmt(row.windMaxKt, 1))}</td>
      <td>${escapeHtml(fmt(row.gustKt, 1))}</td>
      <td>${escapeHtml(compass(row.windDirDeg))}</td>
      <td>${escapeHtml(fmt(row.swellM, 2))}</td>
      <td>${escapeHtml(fmt(row.swellPeriodS, 1))}</td>
      <td>${escapeHtml(compass(row.swellDirDeg))}</td>
      <td>${escapeHtml(fmt(row.waveM, 2))}</td>
      <td>${escapeHtml(fmt(row.wavePeriodS, 1))}</td>
      <td>${escapeHtml(weatherText(row.weatherCode))}</td>
      <td>${escapeHtml(conditions)}</td>
    </tr>`;
    }).join("");
    byId("table-body").innerHTML = body || `<tr><td colspan="19">No rows in this filter.</td></tr>`;
    renderCharts(snapshot);
    renderHourly(snapshot);
    const canExport = state.exportReady && state.snapshot !== null;
    byId("export-csv").disabled = !canExport;
    byId("export-pdf").disabled = !canExport;
}
function renderHourly(snapshot) {
    const rows = snapshot.hours.filter((row) => row.date === state.selected);
    byId("hourly-title").textContent = state.selected ? `Hourly · ${state.selected}` : "Hourly";
    byId("hourly-body").innerHTML = rows.length
        ? rows.map((row) => `<tr>
        <td>${escapeHtml(row.time.slice(11, 16))}</td>
        <td>${escapeHtml(fmt(row.tempC, 1))}</td>
        <td>${escapeHtml(fmt(row.humidityPct, 0))}</td>
        <td>${escapeHtml(fmt(row.dewPointC, 1))}</td>
        <td>${escapeHtml(fmt(row.rainMm, 2))}</td>
        <td>${escapeHtml(fmt(row.precipMm, 2))}</td>
        <td>${escapeHtml(fmt(row.cloudPct, 0))}</td>
        <td>${escapeHtml(fmt(row.cloudLowPct, 0))}</td>
        <td>${escapeHtml(fmt(row.windKt, 1))}</td>
        <td>${escapeHtml(fmt(row.gustKt, 1))}</td>
        <td>${escapeHtml(fmt(row.swellM, 2))}</td>
        <td>${escapeHtml(fmt(row.waveM, 2))}</td>
        <td>${escapeHtml(weatherText(row.weatherCode))}</td>
      </tr>`).join("")
        : `<tr><td colspan="13">No hourly values for this day.</td></tr>`;
}
function remember(snapshot, stale) {
    state.snapshot = snapshot;
    state.stale = stale;
    state.exportReady = true;
    if (!snapshot.dates.includes(state.selected))
        state.selected = snapshot.today;
    const saved = { savedAt: snapshot.fetchedAt, stale, snapshot };
    localStorage.setItem(CACHE_KEY, JSON.stringify(saved));
    render(snapshot);
}
async function loadSite() {
    const query = readForm();
    if ("error" in query) {
        const still = state.snapshot ? " The table is still the previous lookup." : "";
        setStatus(query.error + still);
        return;
    }
    setStatus("Loading Open-Meteo…");
    byId("load-btn").disabled = true;
    const now = new Date();
    const weatherRequest = forecastUrl(query);
    const marineRequest = marineUrl(query, 15);
    const today = formatYmd(now, query.timezone);
    const archiveRequest = archiveUrl(query, addCalendarDays(today, -15), addCalendarDays(today, -1));
    try {
        const weather = await fetchEndpoint(weatherRequest);
        if (!weather.ok)
            throw new Error(weather.error);
        const [marine, archive] = await Promise.all([
            fetchMarine(query),
            fetchEndpoint(archiveRequest),
        ]);
        const assembled = assemble({
            now,
            query,
            weather,
            marine: marine.result,
            archive,
            marineForecastDays: marine.forecastDays,
            weatherUrl: weatherRequest,
            marineUrl: marine.result.url || marineRequest,
            archiveUrl: archiveRequest,
        });
        if ("error" in assembled)
            throw new Error(assembled.error);
        remember(assembled, false);
        const marineHint = assembled.marineError ? ` Marine: ${assembled.marineError}` : "";
        const archiveHint = assembled.archiveError ? ` Reanalysis: ${assembled.archiveError}` : "";
        setStatus(`Loaded ${assembled.dates[0]} through ${assembled.dates[assembled.dates.length - 1]}.${marineHint}${archiveHint}`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const cached = readCache();
        if (cached) {
            remember(cached.snapshot, true);
            setStatus(`Unavailable from Open-Meteo (${message}). Showing the saved lookup.`);
        }
        else {
            state.snapshot = null;
            state.exportReady = false;
            byId("export-csv").disabled = true;
            byId("export-pdf").disabled = true;
            setStatus(`Unavailable. ${message}`);
        }
    }
    finally {
        byId("load-btn").disabled = false;
    }
}
function readCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw)
        return null;
    try {
        const saved = JSON.parse(raw);
        if (!saved.snapshot || !Array.isArray(saved.snapshot.days))
            return null;
        return saved;
    }
    catch {
        return null;
    }
}
function download(filename, contents, type) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
function exportCsv() {
    if (!state.snapshot)
        return;
    download(`${exportBasename(state.snapshot)}.csv`, toCsv(state.snapshot, state.stale), "text/csv;charset=utf-8");
}
function exportPdf() {
    if (!state.snapshot)
        return;
    const html = reportHtml(state.snapshot, state.selected || state.snapshot.today, state.stale);
    const popup = window.open("", "weathermeter-report");
    if (!popup) {
        setStatus("The PDF report window was blocked. Allow pop-ups for this page, then choose Save as PDF in the print dialog.");
        return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
}
async function findPlace() {
    const name = byId("site-name").value.trim();
    const status = byId("lookup-status");
    const list = byId("lookup-results");
    if (name.length < 2) {
        status.textContent = "Type at least two letters, or enter latitude and longitude yourself.";
        return;
    }
    status.textContent = "Looking up that place…";
    list.innerHTML = "";
    try {
        const response = await fetch(geocodeUrl(name));
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const hits = parseGeocode(await response.json());
        if (!hits.length) {
            status.textContent = "No place matched. Enter the latitude and longitude yourself.";
            return;
        }
        status.textContent = "Choose a match. You can still edit the coordinates after that.";
        list.innerHTML = hits.map((hit, index) => `<li><button type="button" data-hit="${index}">${escapeHtml(hit.label)} · ${hit.latitude.toFixed(2)}, ${hit.longitude.toFixed(2)}</button></li>`).join("");
        list.querySelectorAll("button").forEach((button) => {
            button.addEventListener("click", () => {
                const hit = hits[Number(button.getAttribute("data-hit"))];
                byId("site-name").value = hit.name;
                byId("site-lat").value = String(hit.latitude);
                byId("site-lon").value = String(hit.longitude);
                if (hit.timezone)
                    byId("timezone").value = hit.timezone;
                byId("preset").value = "custom";
                markDirty();
                status.textContent = `${hit.label} filled the coordinates. Load to fetch Open-Meteo.`;
                list.innerHTML = "";
            });
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        status.textContent = `Place lookup failed (${message}). Enter latitude and longitude yourself.`;
    }
}
function tickClock() {
    const now = new Date();
    byId("utc-clock").textContent = now.toISOString().slice(11, 19);
}
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.themeChoice === theme ? "true" : "false");
    });
}
function boot() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
    applyTheme(savedTheme);
    restoreForm();
    refreshMap();
    tickClock();
    const headless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    if (!headless)
        window.setInterval(tickClock, 1000);
    byId("preset").addEventListener("change", applyPreset);
    for (const id of ["site-name", "site-lat", "site-lon", "timezone"]) {
        const field = byId(id);
        const onEdit = () => {
            if (id === "site-lat" || id === "site-lon")
                byId("preset").value = "custom";
            markDirty();
        };
        field.addEventListener("input", onEdit);
        field.addEventListener("change", onEdit);
    }
    byId("site-class").addEventListener("change", () => {
        byId("preset").value = "custom";
        markDirty();
    });
    byId("site-form").addEventListener("submit", (event) => {
        event.preventDefault();
        void loadSite();
    });
    byId("site-lookup").addEventListener("click", () => void findPlace());
    byId("export-csv").addEventListener("click", exportCsv);
    byId("export-pdf").addEventListener("click", exportPdf);
    byId("filter").addEventListener("change", () => {
        state.filter = byId("filter").value;
        if (state.snapshot)
            render(state.snapshot);
    });
    byId("sort").addEventListener("change", () => {
        state.sort = byId("sort").value;
        if (state.snapshot)
            render(state.snapshot);
    });
    byId("table-body").addEventListener("click", (event) => {
        const row = event.target.closest("tr");
        const date = row?.getAttribute("data-date");
        if (!date || !state.snapshot)
            return;
        state.selected = date;
        render(state.snapshot);
    });
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
        button.addEventListener("click", () => applyTheme(button.dataset.themeChoice || "dark"));
    });
    const cached = readCache();
    if (cached) {
        state.selected = cached.snapshot.today;
        remember(cached.snapshot, true);
        setStatus(`Saved lookup from ${cached.snapshot.fetchedAt}. Load again to refresh Open-Meteo.`);
    }
    const params = new URLSearchParams(location.search);
    if (params.get("autoload") === "1") {
        const lat = params.get("lat");
        const lon = params.get("lon");
        if (lat)
            byId("site-lat").value = lat;
        if (lon)
            byId("site-lon").value = lon;
        const site = params.get("site");
        if (site)
            byId("site-class").value = siteClass(site);
        const timezone = params.get("tz");
        if (timezone)
            byId("timezone").value = timezone;
        void loadSite();
    }
}
boot();
