import assert from "node:assert/strict";
import test from "node:test";
import { assemble } from "../js/aggregate.js";
import { SEA_STATE_TEXT } from "../js/satcom.js";
import { windowFor } from "../js/window.js";

const now = new Date("2026-09-29T15:00:00Z");
const query = {
  lat: -20.04,
  lon: -39.52,
  timezone: "America/Sao_Paulo",
  site: "offshore",
  name: "Offshore default",
};

function series(dates, values) {
  return { time: dates, values };
}

function endpoint(daily, hourly = null) {
  return {
    ok: true,
    url: "https://api.open-meteo.com/v1/forecast?latitude=-20.04&longitude=-39.52",
    latitude: -20.08,
    longitude: -39.48,
    elevation: 0,
    timezone: "America/Sao_Paulo",
    daily,
    hourly,
  };
}

function baseInput(extra) {
  const { dates } = windowFor(now, query.timezone);
  const zeros = dates.map(() => 0);
  const weather = endpoint(
    series(dates, {
      temperature_2m_min: dates.map(() => 22),
      temperature_2m_max: dates.map(() => 28),
      precipitation_sum: zeros,
      rain_sum: dates.map((date) => (date === "2026-09-29" ? 6 : 0)),
      cloud_cover_mean: dates.map(() => 40),
      relative_humidity_2m_mean: dates.map(() => 80),
      wind_speed_10m_max: dates.map(() => 12.5),
      wind_gusts_10m_max: dates.map(() => 18),
      weather_code: dates.map(() => 2),
    }),
    series(
      ["2026-09-29T00:00", "2026-09-29T01:00"],
      {
        rain: [1, 11],
        cloud_cover_low: [10, 20],
        cloud_cover_mid: [10, 20],
        cloud_cover_high: [10, 20],
        weather_code: [2, 2],
        relative_humidity_2m: [70, 90],
      },
    ),
  );
  return {
    now,
    query,
    weather,
    marine: { ok: false, url: "https://marine-api.open-meteo.com/v1/marine", error: "nodename nor servname" },
    archive: { ok: false, url: "https://archive-api.open-meteo.com/v1/archive", error: "nodename nor servname" },
    marineForecastDays: null,
    weatherUrl: weather.url,
    marineUrl: "https://marine-api.open-meteo.com/v1/marine?forecast_days=15",
    archiveUrl: "https://archive-api.open-meteo.com/v1/archive?start_date=2026-09-14&end_date=2026-09-28",
    ...extra,
  };
}

test("archive failure keeps the forecast past_days series and leaves swell unavailable", () => {
  const snapshot = assemble(baseInput());
  assert.equal(snapshot.days.length, 30);
  const past = snapshot.days[0];
  assert.equal(past.date, "2026-09-14");
  assert.equal(past.weatherKind, "archived-forecast");
  assert.equal(past.tempMin, 22);
  assert.match(past.sourceDetail, /Reanalysis unavailable/);
  assert.equal(past.swellM, null);
  assert.equal(past.waveM, null);
  assert.equal(past.marineKind, "unavailable");
  assert.match(past.marineNote, /nodename/);
  const today = snapshot.days.find((row) => row.date === "2026-09-29");
  assert.equal(today.weatherKind, "forecast");
  assert.equal(today.windMaxKt, 12.5);
  assert.ok(today.conditions.includes("Heavy rain"));
  assert.ok(today.conditions.includes("Rain on the path"));
  assert.equal(today.conditions.includes(SEA_STATE_TEXT), false);
});

test("reanalysis does not fill a null rain cell from the archived forecast", () => {
  const { dates } = windowFor(now, query.timezone);
  const archive = endpoint(series(dates.filter((date) => date < "2026-09-29"), {
    temperature_2m_min: dates.filter((date) => date < "2026-09-29").map(() => 21),
    temperature_2m_max: dates.filter((date) => date < "2026-09-29").map(() => 27),
    precipitation_sum: dates.filter((date) => date < "2026-09-29").map(() => 3),
    rain_sum: dates.filter((date) => date < "2026-09-29").map(() => null),
    cloud_cover_mean: dates.filter((date) => date < "2026-09-29").map(() => 55),
  }));
  archive.url = "https://archive-api.open-meteo.com/v1/archive?latitude=-20.04";
  const snapshot = assemble(baseInput({ archive }));
  const past = snapshot.days[0];
  assert.equal(past.weatherKind, "reanalysis");
  assert.equal(past.tempMin, 21);
  assert.equal(past.rainMm, null);
  assert.match(past.sourceDetail, /Archived forecast also on file/);
  assert.match(past.sourceDetail, /Not a local measurement/);
});

test("swell and total wave stay in separate fields, and offshore sea state uses them", () => {
  const { dates } = windowFor(now, query.timezone);
  const marine = endpoint(series(dates, {
    swell_wave_height_max: dates.map(() => 2.4),
    wave_height_max: dates.map(() => 3.1),
    swell_wave_period_max: dates.map(() => 9),
    wave_period_max: dates.map(() => 8),
  }));
  marine.url = "https://marine-api.open-meteo.com/v1/marine?latitude=-20.04";
  marine.latitude = -20.2;
  marine.longitude = -39.3;
  const offshore = assemble(baseInput({ marine, marineForecastDays: 15 }));
  const day = offshore.days.find((row) => row.date === "2026-09-29");
  assert.equal(day.swellM, 2.4);
  assert.equal(day.waveM, 3.1);
  assert.ok(day.conditions.includes(SEA_STATE_TEXT));
  assert.equal(day.marineKind, "marine-forecast");
  const onshore = assemble(baseInput({
    query: { ...query, site: "onshore" },
    marine,
    marineForecastDays: 15,
  }));
  const land = onshore.days.find((row) => row.date === "2026-09-29");
  assert.equal(land.swellM, 2.4);
  assert.equal(land.conditions.includes(SEA_STATE_TEXT), false);
});

test("missing daily humidity is the mean of the hourly samples and is marked calculated", () => {
  const input = baseInput();
  input.weather.daily.values.relative_humidity_2m_mean = input.weather.daily.time.map(() => null);
  const snapshot = assemble(input);
  const today = snapshot.days.find((row) => row.date === "2026-09-29");
  assert.equal(today.humidityCalculated, true);
  assert.equal(today.humidityMean, 80);
});
