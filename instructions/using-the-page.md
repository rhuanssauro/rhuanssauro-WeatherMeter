# Using the page

The page opens on an offshore example, latitude **-20.04**, longitude **-39.52**, timezone **America/Sao_Paulo**. South latitude and west longitude are negative. Type any site you are allowed to look up.

## Coordinates

1. Keep the offshore default, or choose Custom coordinates.
2. Type a place and use **Find place**, or type signed decimal degrees. A comma is accepted as the decimal mark (`-20,04`).
3. Choose Offshore (sea grid cell), Onshore (land weather cell), or Nearest. Swell and total wave still come from the sea cell for Offshore and Onshore. Nearest asks both APIs for the nearest cell.
4. Keep `America/Sao_Paulo` or type another IANA timezone.
5. Select **Load 30 days**.

Find place calls `https://geocoding-api.open-meteo.com/v1/search`. If that host fails, type the coordinates. The place name is a label on the report. It is not sent to the forecast API.

The table shows the grid cell Open-Meteo actually used. That cell can sit a few kilometres from the pin. A land pin can still receive wave numbers from a sea cell. Both coordinate pairs are printed.

Changing latitude, longitude, site class, or timezone turns the CSV and PDF buttons off until the next successful load, so a file cannot be saved under coordinates you have not fetched.

The browser keeps the last form, the last successful lookup, and the theme (`weathermeter:form`, `weathermeter:last`, `weathermeter:theme`). If the next load fails and a saved lookup exists, the page shows that copy and says it is stale. The CSV records `stale: yes`.

## The 30-day window

Dates are computed when you load, in the timezone on the form. They are not written into the program. On 29 Sep 2026 in `America/Sao_Paulo` the rows run 14 Sep–28 Sep, then 29 Sep–13 Oct: 15 calendar days before today, then today through today+14.

| Period | What Open-Meteo is asked for | Label in the table |
| --- | --- | --- |
| 15 days before today | Forecast API `past_days=15` | Archived forecast |
| 15 days before today, when the archive host answers | Historical Weather API | Reanalysis |
| Today and the next 14 days | Forecast API `forecast_days=15` | Forecast |
| Waves and swell, same dates when the marine host answers | Marine API | Marine forecast, or archived marine forecast for past days |

Reanalysis is a model reconstruction. It is not a sensor at the site. When both reanalysis and an archived forecast exist, the cells show the reanalysis. The source text also names the archived-forecast temperature, rain, and cloud values. A null reanalysis field stays **Unavailable**. It is not replaced with the forecast number.

The marine request asks for 15 days. If the server rejects that, the page retries once with 8 and leaves the uncovered days empty.

## What the page shows

Daily columns: date, period, source, temperature min and max (°C), humidity (%), precipitation (mm), rain (mm), cloud cover (%), sustained wind max and gust (kt), wind direction, swell height (m) and period (s), swell direction, total wave height (m) and period (s), weather code, and conditions.

Precipitation is the combined water total. Rain is the rain portion. They are separate columns. Snow, when the model has it, is in the CSV as centimetres.

Hourly rows for the selected day add dew point, low cloud, and visibility. Select a row in the daily table to change the day. The PDF hourly section is that selected day. The CSV contains every daily row and every hourly row in the window.

Small charts cover temperature max, rain, cloud, gust, swell, and total wave. A gap is a missing value.

Units are Celsius, millimetres, knots, percent cloud cover, metres, and seconds.

### Conditions

These flags can appear together. They are application labels. They are not fade in dB, and they do not implement ITU-R P.618.

- **Rain on the path** — daily rain at least 5 mm, or any forecast-API hour at least 2 mm.
- **Heavy rain** — any forecast-API hour at least 10 mm.
- **Extensive cloud** — daily mean cloud cover at least 80%, or any low, mid, or high cloud hour at least 90%.
- **Gusts** — daily maximum gust at least 30 kt.
- **Thunderstorm** — WMO weather code 95, 96, or 99.
- **Sea state may move a floating or unstabilized antenna** — offshore sites only, when swell is at least 2.0 m or total wave height is at least 2.5 m.

Onshore rows still show marine numbers. They do not receive the sea-state flag. Hourly rain and cloud flags use the Forecast API hourly series, including `past_days`. On a reanalysis day the daily rain cell is still the reanalysis value.

## CSV and PDF

After a load, **CSV** downloads one file named like `weathermeter_-20.0400_-39.5200_2026-09-29.csv`. Comment lines at the top record the pin, the grid cells, the timezone, the retrieval time, the source URLs, and the Open-Meteo attribution. Column names carry the units. **Unavailable** means the source had no value. Values are not interpolated.

**PDF** opens a report in a new window and starts the browser print dialog. Choose **Save as PDF**. Allow pop-ups for the page if the window does not open. The report is landscape, with the daily table, the selected day’s hours, the condition rules, and the attribution.

## When something fails

| What you see | What it means |
| --- | --- |
| Weather table filled, swell and wave Unavailable | The marine host did not answer, or that model has no value for the date. |
| Source says archived forecast, and a reanalysis warning is on screen | The historical host did not answer. Past days are the forecast API’s own recent series. |
| Some marine days empty after day 8 | The 15-day marine request was rejected and the 8-day retry does not cover the rest. |
| HTTP 429 | The free-tier rate limit answered. The client retries once, then stops. |
| Place lookup failed | Type the latitude and longitude. The forecast call does not need the geocoder. |
| Buttons disabled after an edit | Load again. The previous file belonged to the previous pin. |

One **Load** is two calls when the marine host answers, and three when the historical host also answers. Nothing polls in the background.
