const { mkdirSync, writeFileSync } = require("node:fs");
const { test, expect } = require("@playwright/test");

function responseFor(page, endpoint, parameter) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === endpoint && url.searchParams.has(parameter);
  });
}

test("search for a city and load its current weather and 24 hours from Open-Meteo", async ({ page }) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const input = page.getByLabel("Поиск города");
  await input.fill("Выборг");
  const search = responseFor(page, "/api/search", "q");
  await input.press("Enter");
  const searchResponse = await search;
  expect(searchResponse.ok(), await searchResponse.text()).toBe(true);

  const place = page.getByRole("button", { name: /^Выборг,/ }).first();
  await expect(place).toBeVisible();
  const name = await place.textContent();
  const weather = responseFor(page, "/api/weather", "latitude");
  const forecast = responseFor(page, "/api/forecast", "latitude");
  await place.click();
  const [weatherResponse, forecastResponse] = await Promise.all([weather, forecast]);
  expect(weatherResponse.ok(), await weatherResponse.text()).toBe(true);
  expect(forecastResponse.ok(), await forecastResponse.text()).toBe(true);
  const [current, hourly] = await Promise.all([weatherResponse.json(), forecastResponse.json()]);
  await expect(page.locator("#city-title")).toHaveText(name);
  await expect(page.locator("#temperature")).toContainText("°C");
  await expect(page.locator("#forecast-hours button")).toHaveCount(24);
  expect(current.source.name).toBe("Open-Meteo");
  expect(hourly.source.name).toBe("Open-Meteo");

  mkdirSync("evidence", { recursive: true });
  await page.screenshot({ path: "evidence/live-search.png", fullPage: true });
  const responses = [searchResponse, weatherResponse, forecastResponse].map((response) => ({
    path: new URL(response.url()).pathname,
    status: response.status(),
  }));
  writeFileSync("evidence/live-browser.json", JSON.stringify({
    source: current.source.name, timestamp: new Date().toISOString(), city: name,
    observedAt: current.current.time, timezone: current.timezone, forecastHours: hourly.hours.length, responses,
  }, null, 2) + "\n");
});
