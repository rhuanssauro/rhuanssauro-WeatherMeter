import assert from "node:assert/strict";
import test from "node:test";
import { conditionFlags, SEA_STATE_TEXT } from "../js/satcom.js";

function input(overrides) {
  return {
    site: "offshore",
    rainDaily: 0,
    hourlyRain: [0],
    cloudMean: 10,
    hourlyCloudLow: [10],
    hourlyCloudMid: [10],
    hourlyCloudHigh: [10],
    gustKt: 10,
    weatherCode: 1,
    hourlyCodes: [1],
    swellM: 0.4,
    waveM: 0.6,
    ...overrides,
  };
}

test("condition thresholds match the published rules", () => {
  assert.deepEqual(conditionFlags(input({ rainDaily: 5 })), ["Rain on the path"]);
  assert.deepEqual(conditionFlags(input({ hourlyRain: [2] })), ["Rain on the path"]);
  assert.deepEqual(conditionFlags(input({ hourlyRain: [10] })), ["Heavy rain", "Rain on the path"]);
  assert.ok(conditionFlags(input({ cloudMean: 80 })).includes("Extensive cloud"));
  assert.ok(conditionFlags(input({ hourlyCloudLow: [90] })).includes("Extensive cloud"));
  assert.ok(conditionFlags(input({ gustKt: 30 })).includes("Gusts"));
  assert.ok(conditionFlags(input({ weatherCode: 95 })).includes("Thunderstorm"));
  assert.ok(conditionFlags(input({ swellM: 2 })).includes(SEA_STATE_TEXT));
  assert.equal(conditionFlags(input({ site: "onshore", swellM: 3, waveM: 4 })).includes(SEA_STATE_TEXT), false);
  assert.deepEqual(conditionFlags(input({})), []);
});
