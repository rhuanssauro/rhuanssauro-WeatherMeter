export const RAIN_DAILY_MM = 5;
export const RAIN_HOURLY_MM = 2;
export const HEAVY_RAIN_HOURLY_MM = 10;
export const CLOUD_MEAN_PCT = 80;
export const CLOUD_LAYER_PCT = 90;
export const GUST_KT = 30;
export const SWELL_M = 2;
export const WAVE_M = 2.5;
export const THUNDER_CODES = new Set([95, 96, 99]);
export const SEA_STATE_TEXT = "Sea state may move a floating or unstabilized antenna";
function maxOf(values) {
    const nums = values.filter((value) => value !== null && Number.isFinite(value));
    if (!nums.length)
        return null;
    return Math.max(...nums);
}
export function conditionFlags(input) {
    const flags = [];
    const hourlyMax = maxOf(input.hourlyRain);
    if ((hourlyMax !== null && hourlyMax >= HEAVY_RAIN_HOURLY_MM))
        flags.push("Heavy rain");
    if ((input.rainDaily !== null && input.rainDaily >= RAIN_DAILY_MM) ||
        (hourlyMax !== null && hourlyMax >= RAIN_HOURLY_MM)) {
        flags.push("Rain on the path");
    }
    const layerMax = maxOf([...input.hourlyCloudLow, ...input.hourlyCloudMid, ...input.hourlyCloudHigh]);
    if ((input.cloudMean !== null && input.cloudMean >= CLOUD_MEAN_PCT) ||
        (layerMax !== null && layerMax >= CLOUD_LAYER_PCT)) {
        flags.push("Extensive cloud");
    }
    if (input.gustKt !== null && input.gustKt >= GUST_KT)
        flags.push("Gusts");
    const codes = [input.weatherCode, ...input.hourlyCodes];
    if (codes.some((code) => code !== null && THUNDER_CODES.has(code)))
        flags.push("Thunderstorm");
    if (input.site === "offshore") {
        const roughSwell = input.swellM !== null && input.swellM >= SWELL_M;
        const roughWave = input.waveM !== null && input.waveM >= WAVE_M;
        if (roughSwell || roughWave)
            flags.push(SEA_STATE_TEXT);
    }
    return flags;
}
