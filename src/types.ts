export type SiteClass = "offshore" | "onshore" | "nearest";

export type Period = "past" | "today" | "future";

export type WeatherKind = "forecast" | "archived-forecast" | "reanalysis" | "unavailable";

export type MarineKind = "marine-forecast" | "archived-marine-forecast" | "unavailable";

export interface Query {
  lat: number;
  lon: number;
  timezone: string;
  site: SiteClass;
  name: string;
}

export interface NumericSeries {
  time: string[];
  values: Record<string, (number | null)[]>;
}

export interface EndpointData {
  ok: true;
  url: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  timezone: string | null;
  daily: NumericSeries | null;
  hourly: NumericSeries | null;
}

export interface EndpointFailure {
  ok: false;
  url: string;
  error: string;
}

export type EndpointResult = EndpointData | EndpointFailure;

export interface DayRow {
  date: string;
  period: Period;
  weatherKind: WeatherKind;
  sourceDetail: string;
  tempMin: number | null;
  tempMax: number | null;
  humidityMean: number | null;
  humidityCalculated: boolean;
  precipMm: number | null;
  rainMm: number | null;
  showersMm: number | null;
  snowCm: number | null;
  cloudMean: number | null;
  windMaxKt: number | null;
  gustKt: number | null;
  windDirDeg: number | null;
  weatherCode: number | null;
  swellM: number | null;
  swellPeriodS: number | null;
  swellDirDeg: number | null;
  waveM: number | null;
  wavePeriodS: number | null;
  waveDirDeg: number | null;
  windWaveM: number | null;
  marineKind: MarineKind;
  marineNote: string;
  conditions: string[];
}

export interface HourRow {
  time: string;
  date: string;
  tempC: number | null;
  humidityPct: number | null;
  dewPointC: number | null;
  precipMm: number | null;
  rainMm: number | null;
  cloudPct: number | null;
  cloudLowPct: number | null;
  cloudMidPct: number | null;
  cloudHighPct: number | null;
  windKt: number | null;
  gustKt: number | null;
  windDirDeg: number | null;
  weatherCode: number | null;
  visibilityM: number | null;
  swellM: number | null;
  swellPeriodS: number | null;
  swellDirDeg: number | null;
  waveM: number | null;
  wavePeriodS: number | null;
  waveDirDeg: number | null;
}

export interface Snapshot {
  fetchedAt: string;
  query: Query;
  today: string;
  dates: string[];
  weatherGrid: { lat: number; lon: number; elevation: number | null } | null;
  marineGrid: { lat: number; lon: number } | null;
  weatherUrl: string;
  marineUrl: string;
  archiveUrl: string;
  marineError: string | null;
  archiveError: string | null;
  marineForecastDays: number | null;
  days: DayRow[];
  hours: HourRow[];
}
