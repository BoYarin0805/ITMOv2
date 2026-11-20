const { test, expect } = require("@playwright/test");
const source = { name: "Open-Meteo", url: "https://open-meteo.com/" };
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
  return { city, timezone: "Europe/Moscow", source, current: { temperature_2m: 12.1, apparent_temperature: 10.2,
    relative_humidity_2m: 68, wind_speed_10m: 3.4, weather_code: 0, is_day: 1, description: "Ясно", time: "2026-10-29T09:15" },
    units: { temperature_2m: "°C", apparent_temperature: "°C", relative_humidity_2m: "%", wind_speed_10m: "m/s",
      weather_code: "wmo code", is_day: "" } };
}
function forecast(city) {
  return { city, timezone: "Europe/Moscow", source, units: { temperature_2m: "°C" },
    updated: "2026-10-29T09:15+03:00", hours: Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 9, 29, 10 + index));
    return { timestamp: date.valueOf() / 1000 - 3 * 3600, time: `${date.toISOString().slice(0, 16)}+03:00`,
      temperature_2m: index === 0 ? -2 : 9 + Math.sin(index), weather_code: index === 0 ? 71 : 3, is_day: index === 0 ? 0 : 1 };
  }) };
}

async function capture(page, name, region) {
  if (process.env.CAPTURE_EVIDENCE !== "1") return;
  const path = `evidence/${name}.png`;
  if (region) await region.screenshot({ path, animations: "disabled" });
  else await page.screenshot({ path, fullPage: true, animations: "disabled" });
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
  await capture(page, "desktop");
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
  await capture(page, "mobile");
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

test("empty, blank and too short searches show a field error without a request", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/search") requests.push(request.url());
  });
  await page.goto("/");
  const input = page.getByLabel("Поиск города");
  const button = page.getByRole("button", { name: "Найти город" });
  await expect(input).toBeVisible();
  for (const value of ["", "   ", "В"]) {
    await input.fill(value);
    await button.click();
    await expect(page.locator("#search-status")).toHaveText("Введите название города: от 2 до 100 символов.");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toBeFocused();
  }
  expect(requests).toEqual([]);
  await capture(page, "search-validation", page.getByRole("complementary", { name: "Выбор города" }));
  await input.fill("Выборг");
  await expect(input).toHaveAttribute("aria-invalid", "false");
  await expect(page.locator("#search-message")).toBeEmpty();
});

test("repeated click and Enter during city search produce just one request", async ({ page }) => {
  let release;
  const responseReady = new Promise((resolve) => { release = resolve; });
  const queries = [];
  await page.route("**/api/search?**", async (route) => {
    queries.push(new URL(route.request().url()).searchParams.get("q"));
    await responseReady;
    await route.fulfill({ json: { cities: [{ name: "Выборг", country: "Россия", region: "Ленинградская область",
      latitude: 60.70763, longitude: 28.75283 }] } });
  });
  await page.goto("/");
  const input = page.getByLabel("Поиск города");
  const button = page.getByRole("button", { name: "Найти город" });
  await input.fill("  Выборг  ");
  await button.click();
  try {
    await expect(page.locator("#search-status")).toHaveText("Ищем города…");
    await expect(page.locator("#search-spinner")).toBeVisible();
    await expect(page.locator("#search-form")).toHaveAttribute("aria-busy", "true");
    await expect(button).toBeDisabled();
    await capture(page, "search-loading", page.getByRole("complementary", { name: "Выбор города" }));
    await button.evaluate((element) => element.click());
    await input.press("Enter");
    await input.press("Enter");
    await page.locator("#search-form").evaluate((form) => {
      form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    });
  } finally {
    release();
  }
  await expect(page.getByRole("button", { name: /Выборг, Ленинградская область/ })).toBeVisible();
  await expect(button).toBeEnabled();
  await expect(page.locator("#search-form")).toHaveAttribute("aria-busy", "false");
  expect(queries).toEqual(["Выборг"]);
});

test("empty response and an API error are distinct and a retry recovers", async ({ page }) => {
  const queryAttempts = new Map();
  await page.route("**/api/search?**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    const count = (queryAttempts.get(query) || 0) + 1;
    queryAttempts.set(query, count);
    if (query === "Небоград") return route.fulfill({ json: { cities: [] } });
    if (count === 1) return route.fulfill({ status: 502, json: { error: "Попробуйте ещё раз." } });
    return route.fallback();
  });
  await page.goto("/");
  const panel = page.getByRole("complementary", { name: "Выбор города" });
  const input = page.getByLabel("Поиск города");
  const button = page.getByRole("button", { name: "Найти город" });
  await input.fill("Небоград");
  await button.click();
  await expect(page.locator("#search-status")).toHaveText("Ничего не найдено. Попробуйте другое название.");
  await expect(page.locator("#search-results li")).toHaveCount(0);
  await capture(page, "search-empty", panel);
  await input.fill("Выборг");
  await input.press("Enter");
  await expect(page.locator("#search-status")).toHaveText("Поиск недоступен. Попробуйте ещё раз.");
  await expect(input).toHaveValue("Выборг");
  await capture(page, "search-error", panel);
  await button.click();
  await expect(page.getByRole("button", { name: /Выборг, Ленинградская область/ })).toBeVisible();
  expect(queryAttempts.get("Выборг")).toBe(2);
});

test("keyboard search on a 390px screen selects a city and renders its weather and 24 hours", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#city-title")).toHaveText("Санкт-Петербург");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "К поиску города" })).toBeFocused();
  await page.keyboard.press("Enter");
  const input = page.getByLabel("Поиск города");
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS("outline-style", "solid");
  await page.keyboard.type("Vyborg");
  await page.keyboard.press("Enter");
  const result = page.getByRole("button", { name: /Выборг, Ленинградская область/ });
  await expect(result).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Найти город" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(result).toBeFocused();
  await expect(result).toHaveCSS("outline-style", "solid");
  await capture(page, "search-keyboard-focus", page.getByRole("complementary", { name: "Выбор города" }));
  const nextWeather = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/weather" && url.searchParams.get("latitude") === "60.70763";
  });
  await page.keyboard.press("Enter");
  expect((await nextWeather).status()).toBe(200);
  await expect(page.locator("#city-title")).toHaveText("Выборг, Ленинградская область, Россия");
  await expect(page.locator("#temperature")).toHaveText("12,1 °C");
  await expect(page.locator("#forecast-hours button")).toHaveCount(24);
  await expect(page.locator("#landscape")).toBeFocused();
  await expect(page.locator("#search-results li")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(page, "search-keyboard-success");
});

test("interactive prototype previews loading, empty response, error and weather", async ({ page }) => {
  await page.goto("/prototype.html");
  await expect(page.getByRole("heading", { name: "Прототип поиска города" })).toBeVisible();
  await capture(page, "prototype-start");
  await page.getByRole("button", { name: "Загрузка" }).click();
  await expect(page.locator("#prototype-submit")).toBeDisabled();
  await expect(page.locator("#prototype-status")).toContainText("Ищем города");
  await page.getByRole("button", { name: "Пустой ответ" }).click();
  await expect(page.locator("#prototype-status")).toContainText("Ничего не найдено");
  await page.getByRole("button", { name: "Ошибка", exact: true }).click();
  await expect(page.locator("#prototype-status")).toContainText("Поиск недоступен");
  await page.getByLabel("Поиск города").fill("Выборг");
  await page.getByRole("button", { name: "Найти", exact: true }).click();
  await page.getByRole("button", { name: /Выборг, Ленинградская область/ }).click();
  await expect(page.getByRole("heading", { name: "Выборг, Ленинградская область, Россия" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Погода", exact: true })).toHaveAttribute("aria-pressed", "true");
  await capture(page, "prototype-success");
});
