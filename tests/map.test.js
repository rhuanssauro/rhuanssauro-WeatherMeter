import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { mapsEmbedUrl, mapsOpenUrl } from "../js/map.js";

const pairs = [
  [-20.04, -39.52],
  [-23.55, -46.63],
];

test("map URLs pin the entered latitude and longitude with no API key", () => {
  for (const [lat, lon] of pairs) {
    const embed = mapsEmbedUrl(lat, lon);
    const open = mapsOpenUrl(lat, lon);
    const pair = `${lat},${lon}`;
    assert.match(embed, /^https:\/\/www\.google\.com\/maps/);
    assert.ok(embed.includes(String(lat)), embed);
    assert.ok(embed.includes(String(lon)), embed);
    assert.ok(open.startsWith("https://www.google.com/maps/search/?api=1&query="), open);
    assert.ok(open.includes(pair), open);
    assert.equal(open.includes("AIza"), false);
    assert.equal(embed.includes("AIza"), false);
  }
});

test("a non-finite coordinate yields an empty map URL", () => {
  assert.equal(mapsEmbedUrl(Number.NaN, -39.52), "");
  assert.equal(mapsOpenUrl(-20.04, Number.POSITIVE_INFINITY), "");
  assert.equal(mapsEmbedUrl(-20.04, Number.NaN), "");
  assert.equal(mapsOpenUrl(Number.NEGATIVE_INFINITY, -46.63), "");
});

test("the page ships a map iframe, an open link, and a Google Maps attribution", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const jsDir = new URL("../js/", import.meta.url);
  const scripts = readdirSync(jsDir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFileSync(new URL(name, jsDir), "utf8"))
    .join("\n");
  assert.match(html, /<iframe\b[\s\S]*?id="site-map"/);
  assert.match(html, /<a\b[^>]*id="gmaps-open"[^>]*>Open in Google Maps<\/a>/);
  assert.match(html, /https:\/\/developers\.google\.com\/maps/);
  assert.match(scripts, /mapsEmbedUrl/);
  assert.equal(/AIza/.test(html + scripts), false);
});
