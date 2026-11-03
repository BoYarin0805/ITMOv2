const { test } = require("node:test");
const assert = require("node:assert/strict");
const { selectLandscape } = require("../static/scene.js");
test("season follows hemisphere; weather and night override footage", () => {
  assert.equal(selectLandscape({ code: 0, isDay: 1, month: 1, latitude: 60 }).clip, "winter");
  assert.equal(selectLandscape({ code: 0, isDay: 1, month: 1, latitude: -33 }).clip, "summer");
  assert.equal(selectLandscape({ code: 61, isDay: 1, month: 6 }).clip, "rain");
  assert.equal(selectLandscape({ code: 71, isDay: 1, month: 6 }).clip, "winter");
  assert.equal(selectLandscape({ code: 71, isDay: 0, month: 6 }).clip, "night");
  assert.equal(selectLandscape({ code: 0, isDay: 1, month: 1, season: "spring" }).clip, "spring");
});
