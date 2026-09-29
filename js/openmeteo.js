export const FORECAST_ORIGIN = "https://api.open-meteo.com/v1/forecast";
export const MARINE_ORIGIN = "https://marine-api.open-meteo.com/v1/marine";
export const ARCHIVE_ORIGIN = "https://archive-api.open-meteo.com/v1/archive";
export const GEOCODE_ORIGIN = "https://geocoding-api.open-meteo.com/v1/search";
export const WEATHER_DAILY = [
    "temperature_2m_min",
    "temperature_2m_max",
    "precipitation_sum",
    "rain_sum",
    "showers_sum",
    "snowfall_sum",
    "precipitation_hours",
    "precipitation_probability_max",
    "cloud_cover_mean",
    "relative_humidity_2m_mean",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant",
    "weather_code",
].join(",");
export const WEATHER_HOURLY = [
    "temperature_2m",
    "relative_humidity_2m",
    "dew_point_2m",
    "precipitation",
    "rain",
    "showers",
    "snowfall",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "wind_speed_10m",
    "wind_gusts_10m",
    "wind_direction_10m",
    "weather_code",
    "visibility",
].join(",");
export const MARINE_DAILY = [
    "wave_height_max",
    "wave_direction_dominant",
    "wave_period_max",
    "wind_wave_height_max",
    "swell_wave_height_max",
    "swell_wave_direction_dominant",
    "swell_wave_period_max",
].join(",");
export const MARINE_HOURLY = [
    "wave_height",
    "wave_direction",
    "wave_period",
    "wind_wave_height",
    "swell_wave_height",
    "swell_wave_direction",
    "swell_wave_period",
].join(",");
export const ARCHIVE_DAILY = [
    "temperature_2m_min",
    "temperature_2m_max",
    "precipitation_sum",
    "rain_sum",
    "cloud_cover_mean",
    "relative_humidity_2m_mean",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "weather_code",
].join(",");
export function cellSelection(site) {
    if (site === "offshore")
        return "sea";
    if (site === "onshore")
        return "land";
    return "nearest";
}
/** Waves are defined on sea cells. Onshore weather stays on land; swell still uses the sea cell. */
export function marineCellSelection(site) {
    return site === "nearest" ? "nearest" : "sea";
}
function coord(value) {
    return String(value);
}
export function forecastUrl(query) {
    const params = new URLSearchParams({
        latitude: coord(query.lat),
        longitude: coord(query.lon),
        timezone: query.timezone,
        past_days: "15",
        forecast_days: "15",
        wind_speed_unit: "kn",
        temperature_unit: "celsius",
        precipitation_unit: "mm",
        cell_selection: cellSelection(query.site),
        daily: WEATHER_DAILY,
        hourly: WEATHER_HOURLY,
    });
    return `${FORECAST_ORIGIN}?${params.toString()}`;
}
export function marineUrl(query, forecastDays) {
    const params = new URLSearchParams({
        latitude: coord(query.lat),
        longitude: coord(query.lon),
        timezone: query.timezone,
        past_days: "15",
        forecast_days: String(forecastDays),
        cell_selection: marineCellSelection(query.site),
        daily: MARINE_DAILY,
        hourly: MARINE_HOURLY,
    });
    return `${MARINE_ORIGIN}?${params.toString()}`;
}
export function archiveUrl(query, startDate, endDate) {
    const params = new URLSearchParams({
        latitude: coord(query.lat),
        longitude: coord(query.lon),
        timezone: query.timezone,
        start_date: startDate,
        end_date: endDate,
        wind_speed_unit: "kn",
        temperature_unit: "celsius",
        precipitation_unit: "mm",
        daily: ARCHIVE_DAILY,
    });
    return `${ARCHIVE_ORIGIN}?${params.toString()}`;
}
export function geocodeUrl(name) {
    const params = new URLSearchParams({
        name: name.trim(),
        count: "5",
        language: "en",
        format: "json",
    });
    return `${GEOCODE_ORIGIN}?${params.toString()}`;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function errorText(response) {
    const text = await response.text();
    try {
        const body = JSON.parse(text);
        if (typeof body.reason === "string" && body.reason)
            return `HTTP ${response.status} ${body.reason}`;
    }
    catch {
        /* body was not JSON */
    }
    const clipped = text.replace(/\s+/g, " ").slice(0, 160);
    return clipped ? `HTTP ${response.status} ${clipped}` : `HTTP ${response.status}`;
}
export async function fetchJson(url, fetchImpl = fetch, waitMs = 400) {
    let last = "request failed";
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const response = await fetchImpl(url);
            if (response.status === 429 || response.status >= 500) {
                last = await errorText(response);
                if (attempt === 0)
                    await sleep(waitMs);
                continue;
            }
            if (!response.ok)
                return { ok: false, error: await errorText(response) };
            return { ok: true, data: await response.json() };
        }
        catch (error) {
            last = error instanceof Error ? error.message : String(error);
            if (attempt === 0)
                await sleep(waitMs);
        }
    }
    return { ok: false, error: last };
}
function asRecord(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    return value;
}
function numberOrNull(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function readSeries(block) {
    const record = asRecord(block);
    if (!record || !Array.isArray(record.time) || record.time.length === 0)
        return null;
    const time = record.time.map((item) => String(item));
    const values = {};
    for (const [key, raw] of Object.entries(record)) {
        if (key === "time" || !Array.isArray(raw))
            continue;
        values[key] = time.map((_, index) => numberOrNull(raw[index]));
    }
    return { time, values };
}
export function parseEndpoint(data, url) {
    const record = asRecord(data);
    if (!record)
        return { ok: false, url, error: "Response was not a JSON object" };
    if (record.error === true) {
        const reason = typeof record.reason === "string" ? record.reason : "Open-Meteo returned an error";
        return { ok: false, url, error: reason };
    }
    const latitude = numberOrNull(record.latitude);
    const longitude = numberOrNull(record.longitude);
    if (latitude === null || longitude === null)
        return { ok: false, url, error: "Response has no grid-cell coordinates" };
    const daily = readSeries(record.daily);
    const hourly = readSeries(record.hourly);
    if (!daily && !hourly)
        return { ok: false, url, error: "Response has no daily or hourly series" };
    return {
        ok: true,
        url,
        latitude,
        longitude,
        elevation: numberOrNull(record.elevation),
        timezone: typeof record.timezone === "string" ? record.timezone : null,
        daily,
        hourly,
    };
}
export async function fetchEndpoint(url, fetchImpl = fetch) {
    const result = await fetchJson(url, fetchImpl);
    if (!result.ok)
        return { ok: false, url, error: result.error };
    return parseEndpoint(result.data, url);
}
function horizonRejected(error) {
    return /forecast_days|out of range|HTTP 400/i.test(error);
}
export async function fetchMarine(query, fetchImpl = fetch) {
    const url15 = marineUrl(query, 15);
    const first = await fetchEndpoint(url15, fetchImpl);
    if (first.ok)
        return { result: first, forecastDays: 15 };
    if (!horizonRejected(first.error))
        return { result: first, forecastDays: null };
    const url8 = marineUrl(query, 8);
    const second = await fetchEndpoint(url8, fetchImpl);
    if (second.ok)
        return { result: second, forecastDays: 8 };
    return { result: second, forecastDays: null };
}
export function parseGeocode(data) {
    const record = asRecord(data);
    const results = record && Array.isArray(record.results) ? record.results : [];
    const hits = [];
    for (const item of results) {
        const row = asRecord(item);
        if (!row)
            continue;
        const latitude = numberOrNull(row.latitude);
        const longitude = numberOrNull(row.longitude);
        const name = typeof row.name === "string" ? row.name : "";
        if (!name || latitude === null || longitude === null)
            continue;
        const admin = typeof row.admin1 === "string" ? row.admin1 : "";
        const country = typeof row.country === "string" ? row.country : "";
        const label = [name, admin, country].filter(Boolean).join(", ");
        hits.push({
            name: label,
            label,
            latitude,
            longitude,
            timezone: typeof row.timezone === "string" ? row.timezone : null,
        });
    }
    return hits;
}
