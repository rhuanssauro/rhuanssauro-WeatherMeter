import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assemble } from "../js/aggregate.js";
import { toCsv } from "../js/csv.js";
import { reportHtml } from "../js/report.js";
import { windowFor } from "../js/window.js";

const now = new Date("2026-09-29T15:00:00Z");
const query = {
  lat: -20.04,
  lon: -39.52,
  timezone: "America/Sao_Paulo",
  site: "offshore",
  name: "Offshore <script>",
};

function snapshot() {
  const { dates } = windowFor(now, query.timezone);
  const weather = {
    ok: true,
    url: "https://api.open-meteo.com/v1/forecast?latitude=-20.04&longitude=-39.52&past_days=15&forecast_days=15",
    latitude: -20.08,
    longitude: -39.48,
    elevation: 4,
    timezone: "America/Sao_Paulo",
    daily: {
      time: dates,
      values: {
        temperature_2m_min: dates.map(() => 22),
        temperature_2m_max: dates.map(() => 29),
        rain_sum: dates.map(() => null),
        precipitation_sum: dates.map(() => 0),
        cloud_cover_mean: dates.map(() => 15),
        wind_speed_10m_max: dates.map(() => 8),
        wind_gusts_10m_max: dates.map(() => 12),
      },
    },
    hourly: { time: dates.flatMap((date) => [`${date}T00:00`]), values: { rain: dates.map(() => 0), temperature_2m: dates.map(() => 24) } },
  };
  return assemble({
    now,
    query,
    weather,
    marine: { ok: false, url: "https://marine-api.open-meteo.com/v1/marine", error: "DNS failure" },
    archive: { ok: false, url: "https://archive-api.open-meteo.com/v1/archive", error: "DNS failure" },
    marineForecastDays: null,
    weatherUrl: weather.url,
    marineUrl: "https://marine-api.open-meteo.com/v1/marine",
    archiveUrl: "https://archive-api.open-meteo.com/v1/archive",
  });
}

test("CSV keeps 30 daily rows, hourly rows, units, and unavailable rain", () => {
  const data = snapshot();
  const csv = toCsv(data, false);
  assert.match(csv, /Rhuanssauro Tech Inc/);
  assert.match(csv, /a datacenter in the jungle/);
  assert.match(csv, /Weather data by Open-Meteo.com/);
  assert.match(csv, /CC BY 4.0/);
  assert.equal(csv.includes("apikey"), false);
  const lines = csv.split("\n").filter((line) => line.startsWith("daily,"));
  assert.equal(lines.length, 30);
  assert.match(lines[0], /Unavailable/);
  const hourly = csv.split("\n").filter((line) => line.startsWith("hourly,"));
  assert.equal(hourly.length, 30);
  assert.match(csv, /temp_min_c/);
  assert.match(csv, /swell_height_m/);
  assert.match(csv, /wave_height_m/);
});

test("PDF report escapes the site name and states the limits of the estimate", () => {
  const data = snapshot();
  const html = reportHtml(data, "2026-09-29", false);
  assert.match(html, /Rhuanssauro Tech Inc/);
  assert.match(html, /a datacenter in the jungle/);
  assert.match(html, /Weather data by Open-Meteo.com/);
  assert.match(html, /CC BY 4.0/);
  assert.match(html, /Link margin, antenna pointing, and navigation decisions stay with the operator/);
  assert.match(html, /Swell height and total wave height are separate/);
  assert.match(html, /Offshore &lt;script&gt;/);
  assert.equal(html.includes("<script>alert"), false);
  assert.match(html, /window\.print/);
});

test("the page uses the Rhuanssauro Tech Inc wordmark", () => {
  const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(page, /RHUANSSAURO<span class="inc">Inc\.<\/span>/);
  assert.match(page, /Rhuanssauro Tech Inc/);
  assert.match(page, /a datacenter in the jungle/);
  assert.match(page, /class="claw-mark"/);
});
