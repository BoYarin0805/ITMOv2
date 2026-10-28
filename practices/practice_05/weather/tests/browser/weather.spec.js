const { test, expect } = require("@playwright/test");
const places = [
  { id: "spb", name: "Санкт-Петербург", latitude: 59.94, longitude: 30.31 },
  { id: "moscow", name: "Москва", latitude: 55.75, longitude: 37.62 },
  { id: "kazan", name: "Казань", latitude: 55.79, longitude: 49.12 },
  { id: "sochi", name: "Сочи", latitude: 43.60, longitude: 39.73 },
];
function location(url) {
  const query = new URL(url).searchParams;
  return places.find((item) => item.id === query.get("city")) || { name: query.get("name") || "Выборг", latitude: 60.70763, longitude: 28.75283 };
}
function current(city) {
  return { city, timezone: "Europe/Moscow", current: { temperature_2m: 12.1, apparent_temperature: 10.2,
    relative_humidity_2m: 68, wind_speed_10m: 3.4, weather_code: 0, is_day: 1, description: "Ясно", time: "2026-10-29T09:15" } };
}
function forecast(city) {
  return { city, timezone: "Europe/Moscow", updated: "2026-10-29T09:15+03:00", hours: Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 29, 10 + index));
    return { timestamp: 1793260800 + index * 3600, time: `${date.toISOString().slice(0, 16)}+03:00`,
      temperature_2m: index === 0 ? -2 : 9 + Math.sin(index), weather_code: index === 0 ? 71 : 3, is_day: index === 0 ? 0 : 1 };
  }) };
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const pathname = new URL(url).pathname;
    let body;
    if (pathname === "/api/cities") body = { cities: places };
    else if (pathname === "/api/weather") body = current(location(url));
    else if (pathname === "/api/forecast") body = forecast(location(url));
    else if (pathname === "/api/search") body = { cities: [{ name: "Выборг", country: "Россия", region: "Ленинградская область", latitude: 60.70763, longitude: 28.75283 }] };
    else return route.continue();
    await route.fulfill({ json: body });
  });
});

test("forecast preview, demo and return preserve live data; local time ignores device zone", async ({ page }) => {
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#forecast-hours button")).toHaveCount(24);
  await expect(page.locator("#city-title")).toHaveText("Санкт-Петербург");
  const temperature = await page.locator("#temperature").textContent();
  await page.locator("#forecast-hours button").first().click();
  await expect(page.locator("#scene-mode")).toContainText("Прогноз");
  await expect(page.locator("#scene-label")).toHaveText("Снег · Ночь");
  await expect(page.locator("#scene-info")).toContainText("10:00 · UTC+03:00");
  await expect(page.locator("#temperature")).toHaveText(temperature);
  await page.locator("#back-live").click();
  await expect(page.locator("#scene-mode")).toHaveText("Реальные данные");
  await page.locator("summary").click();
  await page.locator("#scenario").selectOption("rain");
  await expect(page.locator("#bg-video")).toHaveAttribute("src", "/media/rain.webm");
  await expect(page.locator("#scene-mode")).toContainText("ДЕМОНСТРАЦИЯ");
  await expect(page.locator("#temperature")).toHaveText(temperature);
  await page.locator("#scenario").selectOption("live");
  await page.locator("#motion-toggle").click();
  await page.screenshot({ path: "evidence/desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("search and favorites add before weather response, survive reload and remove without changing city", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Поиск города").fill("Выборг"); await page.getByRole("button", { name: "Найти город" }).click();
  await page.locator("#search-results button").click();
  await expect(page.locator("#city-title")).toContainText("Выборг");
  await page.locator("#add-favorite").click();
  await expect(page.locator(".favorite-pick")).toContainText("Выборг");
  await page.reload();
  await expect(page.locator(".favorite-pick")).toContainText("Выборг");
  await page.locator(".favorite-pick").click();
  await expect(page.locator("#city-title")).toContainText("Выборг");
  await page.getByRole("button", { name: /Удалить .* из избранного/ }).click();
  await expect(page.locator(".favorite-pick")).toHaveCount(0);
  await expect(page.locator("#city-title")).toContainText("Выборг");
  await expect(page.locator("#add-favorite")).toBeFocused();
});

test("forecast outage retains current conditions and retry recovers", async ({ page }) => {
  await page.route("**/api/forecast?**", (route) => route.fulfill({ status: 502, json: { error: "Прогноз недоступен." } }));
  await page.goto("/");
  await expect(page.locator("#weather")).toBeVisible();
  await expect(page.locator("#forecast-status")).toHaveText("Прогноз недоступен.");
  await expect(page.locator("#forecast-retry")).toBeVisible();
  await page.unroute("**/api/forecast?**");
  await page.locator("#forecast-retry").click();
  await expect(page.locator("#forecast-hours button")).toHaveCount(24);
});

test("latest city forecast wins; changing city clears future preview", async ({ page }) => {
  let release;
  const delayed = new Promise((resolve) => { release = resolve; });
  await page.route("**/api/forecast?city=moscow", async (route) => {
    await delayed; await route.fulfill({ json: forecast(places[1]) });
  });
  await page.goto("/"); await expect(page.locator("#forecast-hours button")).toHaveCount(24);
  await page.locator("#forecast-hours button").first().click();
  await page.locator("#city").selectOption("moscow");
  await expect(page.locator("#scene-mode")).toHaveText("Реальные данные");
  await page.locator("#city").selectOption("kazan");
  await expect(page.locator("#forecast-status")).toContainText("Казань");
  release(); await page.waitForTimeout(150);
  await expect(page.locator("#forecast-status")).toContainText("Казань");
});

test("storage failure warns but selected city and session favorites work", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new Error("Denied"); } }));
  await page.goto("/");
  await expect(page.locator("#add-favorite")).toBeEnabled();
  await page.locator("#add-favorite").click();
  await expect(page.locator(".favorite-pick")).toHaveCount(1);
  await expect(page.locator("#favorites-status")).toContainText("только до перезагрузки");
  await expect(page.locator("#weather")).toBeVisible();
});

test("mobile, reduced motion and all seasonal posters remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await expect(page.locator("#weather")).toBeVisible();
  await expect(page.locator("#motion-toggle")).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator("#bg-video").evaluate((video) => video.paused)).toBe(true);
  await page.locator("summary").click();
  for (const season of ["spring", "summer", "autumn", "winter"]) {
    await page.locator("#season").selectOption(season);
    await expect(page.locator("#bg-video")).toHaveAttribute("poster", `/media/${season}.jpg`);
    await expect.poll(() => page.locator("#bg-video").evaluate((video) => video.paused)).toBe(true);
  }
  await page.locator("#season").selectOption("autumn");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "evidence/mobile.png", fullPage: true });
});

test("favorite can be added while the selected city's weather is still loading", async ({ page }) => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  await page.route("**/api/weather?**", async (route) => { await pending; await route.fulfill({ json: current(location(route.request().url())) }); });
  await page.goto("/");
  await expect(page.locator("#add-favorite")).toBeEnabled();
  await expect(page.locator("#weather")).toBeHidden();
  await page.locator("#add-favorite").click();
  await expect(page.locator(".favorite-pick")).toHaveText("Санкт-Петербург");
  release(); await expect(page.locator("#weather")).toBeVisible();
});

test("local footage decodes, plays and pauses", async ({ page }) => {
  await page.goto("/");
  const video = page.locator("#bg-video");
  await expect.poll(() => video.evaluate((element) => element.readyState), { timeout: 10000 }).toBeGreaterThanOrEqual(2);
  await expect.poll(() => video.evaluate((element) => element.currentTime), { timeout: 10000 }).toBeGreaterThan(0.15);
  await page.locator("#motion-toggle").click();
  const pausedAt = await video.evaluate((element) => element.currentTime);
  await page.waitForTimeout(200);
  expect(Math.abs(await video.evaluate((element) => element.currentTime) - pausedAt)).toBeLessThan(0.05);
});
