const ESC = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};
export function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (ch) => ESC[ch]);
}
export function csvField(value) {
    if (/[",\n\r]/.test(value))
        return `"${value.replace(/"/g, '""')}"`;
    return value;
}
export function fmt(value, digits) {
    if (value === null || Number.isNaN(value))
        return "Unavailable";
    return value.toFixed(digits);
}
export function mean(values) {
    const nums = values.filter((value) => value !== null && Number.isFinite(value));
    if (!nums.length)
        return null;
    return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}
export function compass(deg) {
    if (deg === null || !Number.isFinite(deg))
        return "Unavailable";
    const pts = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
    return `${pts[idx]} ${Math.round(deg)}°`;
}
const WMO = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Freezing drizzle",
    61: "Slight rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Freezing rain",
    71: "Slight snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight showers",
    81: "Showers",
    82: "Violent showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm, slight hail",
    99: "Thunderstorm, heavy hail",
};
export function weatherText(code) {
    if (code === null || !Number.isFinite(code))
        return "Unavailable";
    return WMO[code] ?? `WMO ${code}`;
}
export function isTimeZone(timeZone) {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone });
        return true;
    }
    catch {
        return false;
    }
}
export function parseCoord(raw, kind) {
    const text = raw.trim().replace(",", ".");
    if (!/^[+-]?\d+(?:\.\d+)?$/.test(text))
        return null;
    const value = Number(text);
    if (!Number.isFinite(value))
        return null;
    if (kind === "lat" && (value < -90 || value > 90))
        return null;
    if (kind === "lon" && (value < -180 || value > 180))
        return null;
    return value;
}
