import assert from "node:assert/strict";
import test from "node:test";
import {
  archiveUrl,
  fetchJson,
  fetchMarine,
  forecastUrl,
  geocodeUrl,
  marineUrl,
  parseEndpoint,
} from "../js/openmeteo.js";
import { parseCoord } from "../js/format.js";

const query = {
  lat: -20.04,
  lon: -39.52,
  timezone: "America/Sao_Paulo",
  site: "offshore",
  name: "Offshore default",
};

test("forecast URL asks for the 30-day window in knots and carries no API key", () => {
  const url = forecastUrl(query);
  assert.match(url, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
  assert.match(url, /latitude=-20\.04/);
  assert.match(url, /longitude=-39\.52/);
  assert.match(url, /past_days=15/);
  assert.match(url, /forecast_days=15/);
  assert.match(url, /wind_speed_unit=kn/);
  assert.match(url, /cell_selection=sea/);
  assert.match(url, /rain_sum/);
  assert.match(url, /cloud_cover_mean/);
  assert.doesNotMatch(url, /apikey/i);
});

test("site class selects the marine and land cells", () => {
  assert.match(forecastUrl({ ...query, site: "onshore" }), /cell_selection=land/);
  assert.match(marineUrl({ ...query, site: "onshore" }, 15), /cell_selection=sea/);
  assert.match(marineUrl({ ...query, site: "nearest" }, 8), /cell_selection=nearest/);
  assert.match(marineUrl({ ...query, site: "nearest" }, 8), /forecast_days=8/);
  assert.match(archiveUrl(query, "2026-09-14", "2026-09-28"), /archive-api\.open-meteo\.com/);
  assert.match(geocodeUrl("Sao Paulo"), /geocoding-api\.open-meteo\.com/);
  assert.doesNotMatch(geocodeUrl("Sao Paulo"), /apikey/i);
});

test("coordinates accept a decimal comma and reject out of range", () => {
  assert.equal(parseCoord("-20,04", "lat"), -20.04);
  assert.equal(parseCoord("91", "lat"), null);
  assert.equal(parseCoord("-181", "lon"), null);
});

test("parser keeps nulls and rejects a body without a grid cell", () => {
  const parsed = parseEndpoint({
    latitude: -20.1,
    longitude: -39.4,
    elevation: 0,
    timezone: "America/Sao_Paulo",
    daily: { time: ["2026-09-29"], rain_sum: [null], temperature_2m_max: [28.2] },
  }, "https://api.open-meteo.com/v1/forecast?x=1");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.daily.values.rain_sum[0], null);
  assert.equal(parsed.daily.values.temperature_2m_max[0], 28.2);
  const bad = parseEndpoint({ error: true, reason: "no data" }, "https://example.test");
  assert.equal(bad.ok, false);
  assert.match(bad.error, /no data/);
});

test("fetchJson retries HTTP 429 once", async () => {
  let calls = 0;
  const result = await fetchJson("https://api.open-meteo.com/v1/forecast?latitude=1", async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: false, status: 429, json: async () => ({}), text: async () => "{\"reason\":\"limit\"}" };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => "" };
  }, 0);
  assert.equal(calls, 2);
  assert.equal(result.ok, true);
});

test("marine request falls back from 15 days to 8 when the horizon is rejected", async () => {
  const urls = [];
  const result = await fetchMarine(query, async (url) => {
    urls.push(url);
    if (url.includes("forecast_days=15")) {
      return { ok: false, status: 400, json: async () => ({}), text: async () => "{\"reason\":\"forecast_days out of range\"}" };
    }
    return {
      ok: true,
      status: 200,
      text: async () => "",
      json: async () => ({
        latitude: -20,
        longitude: -39.5,
        daily: { time: ["2026-09-29"], wave_height_max: [1.5], swell_wave_height_max: [1.2] },
      }),
    };
  });
  assert.equal(urls.length, 2);
  assert.match(urls[1], /forecast_days=8/);
  assert.equal(result.forecastDays, 8);
  assert.equal(result.result.ok, true);
  assert.equal(result.result.daily.values.swell_wave_height_max[0], 1.2);
  assert.equal(result.result.daily.values.wave_height_max[0], 1.5);
});
