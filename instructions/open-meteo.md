# Open-Meteo for personal use

Open-Meteo publishes a free API for non-commercial use. No account and no API key are required. Checked against the terms and the about page on 29 Sep 2026:

- Terms: https://open-meteo.com/en/terms
- About: https://open-meteo.com/en/about
- Licence: https://open-meteo.com/en/licence
- Forecast docs: https://open-meteo.com/en/docs
- Marine docs: https://open-meteo.com/en/docs/marine-weather-api
- Historical docs: https://open-meteo.com/en/docs/historical-weather-api

A private app on your own machine, with no subscription and no advertising, matches the personal-use examples they publish. A website with ads, a paid product, or a service you sell is commercial use and needs their paid API on the `customer-` hosts. This repository does not call those hosts and does not contain a key.

Free-tier limits, from the terms page:

- fewer than 600 calls per minute
- fewer than 5,000 calls per hour
- fewer than 10,000 calls per day
- fewer than 300,000 calls per month

Ten loads a day is about 30 calls. Re-read the terms before you raise that, because the published caps can change.

The data licence is CC BY 4.0. The page, the CSV, and the PDF carry this line: **Weather data by Open-Meteo.com**, with links to https://open-meteo.com/ and the licence. Keep that attribution if you copy a table into a note.

Open-Meteo may log IP addresses and the coordinates in the URL for abuse control, and they say those logs are deleted after 90 days. Do not put customer names, circuit IDs, or site codes into the query. The place-name field stays in the browser.

You can try the forecast API before using this page. This is their documented shape, with the fields this app uses and the offshore example pin:

```text
https://api.open-meteo.com/v1/forecast?latitude=-20.04&longitude=-39.52&timezone=America%2FSao_Paulo&past_days=15&forecast_days=15&wind_speed_unit=kn&temperature_unit=celsius&precipitation_unit=mm&cell_selection=sea&hourly=temperature_2m,precipitation,rain,cloud_cover&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,rain_sum,cloud_cover_mean
```

Their own short example is `https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m`. Change everything after `forecast?` to the coordinates and variables you want.

| Series | Host |
| --- | --- |
| Forecast, including the last 15 days of that API | `https://api.open-meteo.com/v1/forecast` |
| Marine waves and swell | `https://marine-api.open-meteo.com/v1/marine` |
| Historical reanalysis | `https://archive-api.open-meteo.com/v1/archive` |
| Place search | `https://geocoding-api.open-meteo.com/v1/search` |

If a host does not answer, the page still shows the series that did answer. Swell, wave, or reanalysis cells say **Unavailable** with the error. The page does not switch to another host and does not invent the missing numbers.

The marine documentation disagrees with itself. The introduction mentions 16 days. The parameter table caps `forecast_days` at 8. Some wave models list longer runs. This app requests 15 marine days, then retries once with 8.
