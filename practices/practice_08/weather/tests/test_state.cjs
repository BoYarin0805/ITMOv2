const assert = require("node:assert/strict");
const { test } = require("node:test");
const { weatherState } = require("../static/weather-state.js");

test("weather categories include precipitation variants and unknown codes", () => {
  for (const [code, kind] of [[0, "clear"], [1, "clear"], [2, "cloudy"], [3, "cloudy"], [48, "fog"],
    [51, "rain"], [57, "rain"], [67, "rain"], [82, "rain"], [71, "snow"], [77, "snow"], [86, "snow"],
    [95, "storm"], [99, "storm"], [999, "unknown"]]) {
    assert.equal(weatherState(code, 1).kind, kind, `code=${code}`);
  }
});
test("night is independent of weather category", () => {
  assert.equal(weatherState(0, 0).icon, "🌙");
  assert.equal(weatherState(0, 1).icon, "☀️");
  assert.equal(weatherState(71, 0).daytime, "Ночь");
  assert.equal(weatherState(71, 0).kind, "snow");
  assert.equal(weatherState(61, 1).daytime, "День");
});
