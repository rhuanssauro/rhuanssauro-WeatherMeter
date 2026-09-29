import { mean } from "./format.js";
import { conditionFlags } from "./satcom.js";
import type { DayRow, EndpointResult, HourRow, NumericSeries, Query, Snapshot, WeatherKind } from "./types.js";
import { periodOf, windowFor } from "./window.js";

type Row = Record<string, number | null>;

const CORE = ["temperature_2m_min", "temperature_2m_max", "precipitation_sum", "rain_sum", "cloud_cover_mean"];

function indexDaily(series: NumericSeries | null): Map<string, Row> {
  const map = new Map<string, Row>();
  if (!series) return map;
  series.time.forEach((stamp, index) => {
    const row: Row = {};
    for (const [key, values] of Object.entries(series.values)) row[key] = values[index] ?? null;
    map.set(stamp.slice(0, 10), row);
  });
  return map;
}

function indexHours(series: NumericSeries | null): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  if (!series) return map;
  series.time.forEach((stamp, index) => {
    const date = stamp.slice(0, 10);
    const row: Row = { __index: index };
    for (const [key, values] of Object.entries(series.values)) row[key] = values[index] ?? null;
    const bucket = map.get(date) ?? [];
    bucket.push(row);
    map.set(date, bucket);
  });
  return map;
}

function hourMap(series: NumericSeries | null): Map<string, Row> {
  const map = new Map<string, Row>();
  if (!series) return map;
  series.time.forEach((stamp, index) => {
    const row: Row = {};
    for (const [key, values] of Object.entries(series.values)) row[key] = values[index] ?? null;
    map.set(stamp, row);
  });
  return map;
}

function val(row: Row | undefined, key: string): number | null {
  if (!row) return null;
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function hasCore(row: Row | undefined): boolean {
  return CORE.some((key) => val(row, key) !== null);
}

function column(rows: Row[], key: string): (number | null)[] {
  return rows.map((row) => val(row, key));
}

function aside(archived: Row | undefined): string {
  if (!archived || !hasCore(archived)) return "";
  const min = val(archived, "temperature_2m_min");
  const max = val(archived, "temperature_2m_max");
  const rain = val(archived, "rain_sum");
  const cloud = val(archived, "cloud_cover_mean");
  const piece = (value: number | null, digits: number, unit: string) => (value === null ? "Unavailable" : `${value.toFixed(digits)} ${unit}`);
  return ` Archived forecast also on file: temp ${piece(min, 1, "°C")}–${piece(max, 1, "°C")}, rain ${piece(rain, 1, "mm")}, cloud ${piece(cloud, 0, "%")}.`;
}

export function assemble(input: {
  now: Date;
  fetchedAt?: string;
  query: Query;
  weather: EndpointResult;
  marine: EndpointResult;
  archive: EndpointResult;
  marineForecastDays: number | null;
  weatherUrl: string;
  marineUrl: string;
  archiveUrl: string;
}): Snapshot | { error: string } {
  if (!input.weather.ok) return { error: input.weather.error };
  const { today, dates } = windowFor(input.now, input.query.timezone);
  const forecastDaily = indexDaily(input.weather.daily);
  const forecastHours = indexHours(input.weather.hourly);
  const archiveDaily = input.archive.ok ? indexDaily(input.archive.daily) : new Map<string, Row>();
  const marineDaily = input.marine.ok ? indexDaily(input.marine.daily) : new Map<string, Row>();
  const marineByTime = input.marine.ok ? hourMap(input.marine.hourly) : new Map<string, Row>();
  const archiveError = input.archive.ok ? null : input.archive.error;
  const marineError = input.marine.ok ? null : input.marine.error;

  const days: DayRow[] = dates.map((date) => {
    const period = periodOf(date, today);
    const archived = forecastDaily.get(date);
    const reanalysis = archiveDaily.get(date);
    let weatherKind: WeatherKind;
    let chosen: Row | undefined;
    let sourceDetail: string;
    if (period === "past" && hasCore(reanalysis)) {
      weatherKind = "reanalysis";
      chosen = reanalysis;
      sourceDetail = `Reanalysis from the Historical Weather API. Not a local measurement.${aside(archived)}`;
    } else if (period === "past") {
      weatherKind = archived ? "archived-forecast" : "unavailable";
      chosen = archived;
      sourceDetail = archiveError
        ? `Archived forecast from the Forecast API past_days series. Reanalysis unavailable: ${archiveError}`
        : "Archived forecast from the Forecast API past_days series. Reanalysis had no value for this date.";
      if (!archived) sourceDetail = `Unavailable. Forecast API returned no row for ${date}. ${sourceDetail}`;
    } else {
      weatherKind = archived ? "forecast" : "unavailable";
      chosen = archived;
      sourceDetail = archived
        ? "Forecast from the Forecast API."
        : `Unavailable. Forecast API returned no row for ${date}.`;
    }

    const hours = forecastHours.get(date) ?? [];
    let humidity = val(chosen, "relative_humidity_2m_mean");
    let humidityCalculated = false;
    if (humidity === null) {
      const calculated = mean(column(hours, "relative_humidity_2m"));
      if (calculated !== null) {
        humidity = calculated;
        humidityCalculated = true;
        sourceDetail += " Mean humidity was calculated from hourly Forecast API values.";
      }
    }

    const marineRow = marineDaily.get(date);
    const marineValues = [
      val(marineRow, "swell_wave_height_max"),
      val(marineRow, "wave_height_max"),
      val(marineRow, "swell_wave_period_max"),
      val(marineRow, "wave_period_max"),
    ];
    const marineHasNumber = marineValues.some((value) => value !== null);
    let marineKind: DayRow["marineKind"];
    let marineNote: string;
    if (!input.marine.ok) {
      marineKind = "unavailable";
      marineNote = input.marine.error;
    } else if (!marineHasNumber) {
      marineKind = "unavailable";
      marineNote = input.marineForecastDays === 8
        ? "Marine model did not return this date. A 15-day request was rejected, and the 8-day retry does not cover the rest of the window."
        : "Marine model returned no value for this date.";
    } else if (period === "past") {
      marineKind = "archived-marine-forecast";
      marineNote = "Archived marine forecast from the Marine API past_days series. Not a wave measurement.";
    } else {
      marineKind = "marine-forecast";
      marineNote = "Marine forecast.";
    }

    const rainMm = val(chosen, "rain_sum");
    const cloudMean = val(chosen, "cloud_cover_mean");
    const gustKt = val(chosen, "wind_gusts_10m_max");
    const weatherCode = val(chosen, "weather_code");
    const swellM = val(marineRow, "swell_wave_height_max");
    const waveM = val(marineRow, "wave_height_max");
    const conditions = conditionFlags({
      site: input.query.site,
      rainDaily: rainMm,
      hourlyRain: column(hours, "rain"),
      cloudMean,
      hourlyCloudLow: column(hours, "cloud_cover_low"),
      hourlyCloudMid: column(hours, "cloud_cover_mid"),
      hourlyCloudHigh: column(hours, "cloud_cover_high"),
      gustKt,
      weatherCode,
      hourlyCodes: column(hours, "weather_code"),
      swellM,
      waveM,
    });

    return {
      date,
      period,
      weatherKind,
      sourceDetail,
      tempMin: val(chosen, "temperature_2m_min"),
      tempMax: val(chosen, "temperature_2m_max"),
      humidityMean: humidity,
      humidityCalculated,
      precipMm: val(chosen, "precipitation_sum"),
      rainMm,
      showersMm: val(chosen, "showers_sum"),
      snowCm: val(chosen, "snowfall_sum"),
      cloudMean,
      windMaxKt: val(chosen, "wind_speed_10m_max"),
      gustKt,
      windDirDeg: val(chosen, "wind_direction_10m_dominant"),
      weatherCode,
      swellM,
      swellPeriodS: val(marineRow, "swell_wave_period_max"),
      swellDirDeg: val(marineRow, "swell_wave_direction_dominant"),
      waveM,
      wavePeriodS: val(marineRow, "wave_period_max"),
      waveDirDeg: val(marineRow, "wave_direction_dominant"),
      windWaveM: val(marineRow, "wind_wave_height_max"),
      marineKind,
      marineNote,
      conditions,
    };
  });

  const hours: HourRow[] = [];
  const weatherTimes = input.weather.hourly?.time ?? [];
  const weatherValues = input.weather.hourly?.values ?? {};
  weatherTimes.forEach((time, index) => {
    const date = time.slice(0, 10);
    if (!dates.includes(date)) return;
    const at = (key: string) => weatherValues[key]?.[index] ?? null;
    const marine = marineByTime.get(time);
    hours.push({
      time,
      date,
      tempC: at("temperature_2m"),
      humidityPct: at("relative_humidity_2m"),
      dewPointC: at("dew_point_2m"),
      precipMm: at("precipitation"),
      rainMm: at("rain"),
      cloudPct: at("cloud_cover"),
      cloudLowPct: at("cloud_cover_low"),
      cloudMidPct: at("cloud_cover_mid"),
      cloudHighPct: at("cloud_cover_high"),
      windKt: at("wind_speed_10m"),
      gustKt: at("wind_gusts_10m"),
      windDirDeg: at("wind_direction_10m"),
      weatherCode: at("weather_code"),
      visibilityM: at("visibility"),
      swellM: val(marine, "swell_wave_height"),
      swellPeriodS: val(marine, "swell_wave_period"),
      swellDirDeg: val(marine, "swell_wave_direction"),
      waveM: val(marine, "wave_height"),
      wavePeriodS: val(marine, "wave_period"),
      waveDirDeg: val(marine, "wave_direction"),
    });
  });

  return {
    fetchedAt: input.fetchedAt ?? input.now.toISOString(),
    query: input.query,
    today,
    dates,
    weatherGrid: {
      lat: input.weather.latitude,
      lon: input.weather.longitude,
      elevation: input.weather.elevation,
    },
    marineGrid: input.marine.ok ? { lat: input.marine.latitude, lon: input.marine.longitude } : null,
    weatherUrl: input.weatherUrl,
    marineUrl: input.marineUrl,
    archiveUrl: input.archiveUrl,
    marineError,
    archiveError,
    marineForecastDays: input.marineForecastDays,
    days,
    hours,
  };
}
