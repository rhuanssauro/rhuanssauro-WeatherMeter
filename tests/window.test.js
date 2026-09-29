import assert from "node:assert/strict";
import test from "node:test";
import { addCalendarDays, periodOf, windowFor } from "../js/window.js";

test("29 Sep 2026 in America/Sao_Paulo is 15 past days plus today and 14 ahead", () => {
  const window = windowFor(new Date("2026-09-29T15:00:00Z"), "America/Sao_Paulo");
  assert.equal(window.today, "2026-09-29");
  assert.equal(window.dates.length, 30);
  assert.equal(window.dates[0], "2026-09-14");
  assert.equal(window.dates[14], "2026-09-28");
  assert.equal(window.dates[15], "2026-09-29");
  assert.equal(window.dates[29], "2026-10-13");
  assert.equal(periodOf(window.dates[0], window.today), "past");
  assert.equal(periodOf(window.dates[15], window.today), "today");
  assert.equal(periodOf(window.dates[16], window.today), "future");
});

test("a clock time still on the previous Sao Paulo date stays on that date", () => {
  const window = windowFor(new Date("2026-09-29T02:00:00Z"), "America/Sao_Paulo");
  assert.equal(window.today, "2026-09-28");
  assert.equal(window.dates[0], "2026-09-13");
  assert.equal(window.dates[29], "2026-10-12");
});

test("calendar addition crosses month and year boundaries", () => {
  assert.equal(addCalendarDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addCalendarDays("2026-09-29", 14), "2026-10-13");
});
