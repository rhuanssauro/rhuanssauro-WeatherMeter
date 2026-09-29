import { compass, escapeHtml, fmt, weatherText } from "./format.js";
import type { DayRow, Snapshot } from "./types.js";

function td(text: string, extra = ""): string {
  return `<td${extra}>${escapeHtml(text)}</td>`;
}

function dayCells(row: DayRow): string {
  const humidity = row.humidityMean === null
    ? "Unavailable"
    : `${fmt(row.humidityMean, 0)}${row.humidityCalculated ? " (calculated)" : ""}`;
  return [
    td(row.date),
    td(row.period),
    td(row.weatherKind),
    td(fmt(row.tempMin, 1)),
    td(fmt(row.tempMax, 1)),
    td(humidity),
    td(fmt(row.precipMm, 1)),
    td(fmt(row.rainMm, 1)),
    td(fmt(row.cloudMean, 0)),
    td(fmt(row.windMaxKt, 1)),
    td(fmt(row.gustKt, 1)),
    td(compass(row.windDirDeg)),
    td(fmt(row.swellM, 2)),
    td(fmt(row.swellPeriodS, 1)),
    td(fmt(row.waveM, 2)),
    td(fmt(row.wavePeriodS, 1)),
    td(row.conditions.length ? row.conditions.join("; ") : "none flagged"),
    td(row.marineKind),
  ].join("");
}

export function reportHtml(snapshot: Snapshot, selectedDate: string, stale: boolean): string {
  const q = snapshot.query;
  const weather = snapshot.weatherGrid;
  const marine = snapshot.marineGrid;
  const hourly = snapshot.hours.filter((row) => row.date === selectedDate);
  const hourRows = hourly.map((row) => `<tr>
    ${td(row.time)}
    ${td(fmt(row.tempC, 1))}
    ${td(fmt(row.rainMm, 2))}
    ${td(fmt(row.precipMm, 2))}
    ${td(fmt(row.cloudPct, 0))}
    ${td(fmt(row.windKt, 1))}
    ${td(fmt(row.gustKt, 1))}
    ${td(fmt(row.swellM, 2))}
    ${td(fmt(row.waveM, 2))}
    ${td(weatherText(row.weatherCode))}
  </tr>`).join("");
  const dailyRows = snapshot.days.map((row) => `<tr class="${escapeHtml(row.period)}">${dayCells(row)}</tr>`).join("");
  const staleLine = stale ? "<p class=\"warn\">This report was printed from a saved lookup. The latest refresh did not replace it.</p>" : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>WeatherMeter ${escapeHtml(q.lat.toFixed(2))}, ${escapeHtml(q.lon.toFixed(2))} ${escapeHtml(snapshot.today)} — Rhuanssauro Tech Inc</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { margin: 0; color: #1c2118; background: #fff; font: 12px/1.4 "Segoe UI", "Avenir Next", sans-serif; }
    h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.02em; }
    .watermark { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 3px solid #2e6b3d; color: #5e6758; }
    .watermark-name { display: inline-flex; align-items: center; gap: 6px; color: #1c2118; }
    .watermark svg { color: #2e6b3d; }
    .watermark small { letter-spacing: 0.08em; font-size: 10px; }
    h2 { font-size: 15px; margin: 22px 0 6px; }
    p, li { margin: 0 0 6px; }
    .meta { color: #3d4636; }
    .warn { border: 1px solid #8a5a12; background: #fff6e8; padding: 8px 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #ddd4c4; padding: 3px 4px; text-align: left; vertical-align: top; font-variant-numeric: tabular-nums; }
    th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    tr.past td { color: #3e4c5c; }
    tr.future td { color: #6a4310; }
    footer { margin-top: 18px; font-size: 11px; color: #3d4636; }
    a { color: #1f6f5b; }
  </style>
</head>
<body>
  <div class="watermark" role="img" aria-label="Rhuanssauro Tech Inc, a datacenter in the jungle">
    <span class="watermark-name"><svg viewBox="0 0 34 34" width="20" height="20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M7 3 C 11 12, 11 23, 5 33 C 2 23, 3 12, 7 3 Z" transform="rotate(-13 6 18)"></path><path d="M17 2 C 21 12, 21 23, 16 33 C 12 23, 13 12, 17 2 Z"></path><path d="M27 3 C 31 12, 31 23, 25 33 C 22 23, 23 12, 27 3 Z" transform="rotate(13 26 18)"></path></g></svg><strong>Rhuanssauro Tech Inc</strong></span>
    <small>a datacenter in the jungle</small>
  </div>
  <h1>WeatherMeter</h1>
  <p class="meta">${escapeHtml(q.name || "Unnamed site")} · ${escapeHtml(q.site)} · ${escapeHtml(q.timezone)}</p>
  <p class="meta">Requested ${escapeHtml(String(q.lat))}, ${escapeHtml(String(q.lon))}. Today in that timezone: ${escapeHtml(snapshot.today)}. Retrieved ${escapeHtml(snapshot.fetchedAt)}.</p>
  ${staleLine}
  <p class="meta">Weather grid cell ${weather ? `${weather.lat}, ${weather.lon}` : "Unavailable"}${weather && weather.elevation !== null ? `, elevation ${weather.elevation} m` : ""}. Marine grid cell ${marine ? `${marine.lat}, ${marine.lon}` : "Unavailable"}.</p>
  ${snapshot.archiveError ? `<p class="warn">Reanalysis: ${escapeHtml(snapshot.archiveError)}</p>` : ""}
  ${snapshot.marineError ? `<p class="warn">Marine: ${escapeHtml(snapshot.marineError)}</p>` : ""}
  <h2>Daily window</h2>
  <table>
    <thead><tr>
      <th>Date</th><th>Period</th><th>Weather source</th><th>Temp min °C</th><th>Temp max °C</th><th>Humidity %</th>
      <th>Precip mm</th><th>Rain mm</th><th>Cloud %</th><th>Wind max kt</th><th>Gust kt</th><th>Wind dir</th>
      <th>Swell m</th><th>Swell period s</th><th>Wave m</th><th>Wave period s</th><th>Conditions</th><th>Marine source</th>
    </tr></thead>
    <tbody>${dailyRows}</tbody>
  </table>
  <h2>Hourly, ${escapeHtml(selectedDate)}</h2>
  ${hourly.length ? `<table>
    <thead><tr>
      <th>Time</th><th>Temp °C</th><th>Rain mm</th><th>Precip mm</th><th>Cloud %</th><th>Wind kt</th><th>Gust kt</th><th>Swell m</th><th>Wave m</th><th>Weather</th>
    </tr></thead>
    <tbody>${hourRows}</tbody>
  </table>` : "<p>No hourly rows for the selected day.</p>"}
  <h2>How to read the conditions column</h2>
  <ul>
    <li>Rain on the path: daily rain at least 5 mm, or any forecast-API hour at least 2 mm.</li>
    <li>Heavy rain: any forecast-API hour at least 10 mm.</li>
    <li>Extensive cloud: daily mean cloud cover at least 80%, or any low, mid, or high cloud hour at least 90%.</li>
    <li>Gusts: daily maximum gust at least 30 kt.</li>
    <li>Thunderstorm: WMO weather code 95, 96, or 99.</li>
    <li>Offshore sea state: swell at least 2.0 m or total wave height at least 2.5 m. The note is about antenna motion on a floating or unstabilized platform.</li>
  </ul>
  <footer>
    <p>Weather data by Open-Meteo.com. <a href="https://open-meteo.com/">open-meteo.com</a>. Licence: <a href="https://open-meteo.com/en/licence">CC BY 4.0</a>. Terms: <a href="https://open-meteo.com/en/terms">non-commercial free tier</a>.</p>
    <p>Use this report as a weather and sea-state view. Link margin, antenna pointing, and navigation decisions stay with the operator and the proper tools. Reanalysis is not a local measurement. Swell height and total wave height are separate series.</p>
  </footer>
  <script>window.addEventListener("load", function () { window.print(); });</script>
</body>
</html>`;
}
