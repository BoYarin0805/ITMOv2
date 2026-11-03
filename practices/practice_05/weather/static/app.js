"use strict";
const city = document.getElementById("city");
const refresh = document.getElementById("refresh");
const status = document.getElementById("status");
const card = document.getElementById("weather");
const text = (id, value) => { document.getElementById(id).textContent = value; };
const searchInput = document.getElementById("search");
const searchStatus = document.getElementById("search-status");
const results = document.getElementById("search-results");
const scenario = document.getElementById("scenario");
const season = document.getElementById("season");
const video = document.getElementById("bg-video");
const forecastList = document.getElementById("forecast-hours");
const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionPaused = reducedMotion;
let requestNumber = 0, forecastNumber = 0, searchNumber = 0;
let currentWeather = null, selectedLocation = null, selectedHour = null, forecastData = null;
let storage;
try { storage = typeof localStorage === "undefined" ? null : localStorage; } catch { storage = null; }
const favorites = WeatherFavorites.createStore(storage);
const demos = { "clear-day": [0, 1], "clear-night": [0, 0], cloudy: [3, 1], rain: [61, 1], "snow-night": [71, 0], fog: [45, 1], storm: [95, 1] };
const degree = (value) => `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} °C`;
const localTime = (value) => `${value.slice(8, 10)}.${value.slice(5, 7)} · ${value.slice(11, 16)}`;
const seasonLabels = { spring: "Весна", summer: "Лето", autumn: "Осень", winter: "Зима" };

function applyMotion() {
  video.autoplay = !motionPaused;
  text("motion-toggle", motionPaused ? "Продолжить" : "Пауза");
  const button = document.getElementById("motion-toggle");
  button.setAttribute("aria-pressed", String(motionPaused));
  button.setAttribute("aria-label", motionPaused ? "Включить анимацию" : "Приостановить анимацию");
  document.getElementById("landscape").dataset.paused = String(motionPaused);
  if (motionPaused) video.pause(); else video.play()?.catch(() => {});
}
function renderLandscape(code, day, time) {
  const month = Number((time || new Date().toISOString()).slice(5, 7));
  const landscape = WeatherScene.selectLandscape({ code, isDay: day, month, latitude: selectedLocation?.latitude || 0, season: season.value || "auto" });
  const element = document.getElementById("landscape");
  element.dataset.weather = landscape.kind;
  element.dataset.night = String(landscape.night);
  if (video.dataset.clip !== landscape.clip) {
    video.dataset.clip = landscape.clip;
    video.poster = `/media/${landscape.clip}.jpg`;
    video.src = `/media/${landscape.clip}.webm`;
    video.load();
    applyMotion();
  }
  const overridden = season.value && season.value !== "auto";
  text("landscape-label", `${seasonLabels[landscape.season]}${landscape.night ? " · ночь" : " · день"}${overridden ? " · пейзаж выбран" : ""}`);
}
function renderScene() {
  const demo = scenario.value !== "live";
  const output = document.getElementById("scene-output");
  output.dataset.demo = String(demo);
  const mode = demo ? "ДЕМОНСТРАЦИЯ · не реальная погода" : selectedHour ? "Прогноз · будущий час" : "Реальные данные";
  text("scene-mode", mode);
  if (!demo && !selectedHour && !currentWeather) {
    text("scene-icon", "◌"); text("scene-label", "Нет текущих данных");
    text("scene-info", "Дождитесь загрузки погоды или выберите демосценарий.");
    return;
  }
  const data = selectedHour || currentWeather?.current;
  const [code, day] = demo ? demos[scenario.value] : [data.weather_code, data.is_day];
  const state = weatherState(code, day);
  text("scene-icon", state.icon); text("scene-label", `${state.label} · ${state.daytime}`);
  text("scene-info", demo ? "Подготовленный сценарий. Реальные данные города остаются в карточке."
    : selectedHour ? `${localTime(data.time)} · UTC${data.time.slice(-6)} · ${degree(data.temperature_2m)}`
    : `${currentWeather.city.name} · текущие условия`);
  renderLandscape(code, day, data?.time || currentWeather?.current.time);
}
scenario.addEventListener("change", () => { selectedHour = null; highlightHour(); renderScene(); });
season.addEventListener("change", renderScene);
document.getElementById("motion-toggle").addEventListener("click", () => { motionPaused = !motionPaused; applyMotion(); });
video.addEventListener("loadedmetadata", () => { if (motionPaused) video.pause(); });
video.addEventListener("error", () => {
  if (video.src.endsWith(".webm")) {
    video.src = `/media/${video.dataset.clip}.mp4`;
    video.load(); applyMotion();
  }
});
document.getElementById("back-live").addEventListener("click", () => { selectedHour = null; scenario.value = "live"; highlightHour(); renderScene(); });

async function getJSON(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(18000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Не удалось загрузить данные.");
  return data;
}
function selectionQuery() {
  return city.selectedOptions[0]?.dataset.query || new URLSearchParams({ city: city.value }).toString();
}
async function loadWeather() {
  const number = ++requestNumber;
  card.hidden = true; currentWeather = null; renderScene(); refresh.disabled = true;
  status.className = "stage-status"; status.textContent = "Загружаем погоду…";
  try {
    const data = await getJSON(`/api/weather?${selectionQuery()}`);
    if (number !== requestNumber) return;
    currentWeather = data;
    const current = data.current;
    text("city-title", data.city.name); text("temperature", degree(current.temperature_2m));
    text("feels", degree(current.apparent_temperature)); text("humidity", `${current.relative_humidity_2m} %`);
    text("wind", `${new Intl.NumberFormat("ru-RU").format(current.wind_speed_10m)} м/с`);
    text("description", current.description); text("daytime", current.is_day ? "День" : "Ночь");
    text("updated", localTime(current.time)); document.getElementById("updated").dateTime = current.time;
    text("timezone", data.timezone); card.hidden = false; renderScene();
    status.textContent = "";
  } catch (error) {
    if (number !== requestNumber) return;
    status.className = "stage-status error";
    status.textContent = error.name === "TimeoutError" ? "Источник не ответил вовремя. Нажмите «Обновить»." : `Не удалось загрузить погоду. ${error.message}`;
  } finally { if (number === requestNumber) refresh.disabled = false; }
}
function highlightHour() {
  for (const button of forecastList.children) button.setAttribute("aria-pressed", String(Number(button.dataset.timestamp) === selectedHour?.timestamp));
}
async function loadForecast() {
  const number = ++forecastNumber;
  forecastData = null; selectedHour = null; forecastList.replaceChildren(); renderScene();
  text("forecast-status", "Загружаем прогноз…"); document.getElementById("forecast-retry").hidden = true;
  try {
    const data = await getJSON(`/api/forecast?${selectionQuery()}`);
    if (number !== forecastNumber) return;
    forecastData = data;
    for (const hour of data.hours) {
      const button = document.createElement("button");
      const state = weatherState(hour.weather_code, hour.is_day);
      button.type = "button"; button.className = "hour-card"; button.dataset.timestamp = hour.timestamp;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", `${localTime(hour.time)}, UTC${hour.time.slice(-6)}, ${degree(hour.temperature_2m)}, ${state.label}`);
      for (const [className, value] of [["hour-time", hour.time.slice(11, 16)], ["hour-date", `${hour.time.slice(8, 10)}.${hour.time.slice(5, 7)}`], ["hour-icon", state.icon], ["hour-temp", degree(hour.temperature_2m)]]) {
        const span = document.createElement("span"); span.className = className; span.textContent = value; button.append(span);
      }
      button.addEventListener("click", () => { selectedHour = hour; scenario.value = "live"; highlightHour(); renderScene(); });
      forecastList.append(button);
    }
    text("forecast-status", `${data.city.name} · ${data.timezone} · данные на ${localTime(data.updated)}`);
  } catch (error) {
    if (number !== forecastNumber) return;
    text("forecast-status", error.name === "TimeoutError" ? "Прогноз не ответил вовремя." : error.message);
    document.getElementById("forecast-retry").hidden = false;
  }
}
function selectCity() {
  selectedLocation = null;
  const option = city.selectedOptions[0];
  if (option?.dataset.location) selectedLocation = JSON.parse(option.dataset.location);
  document.getElementById("add-favorite").disabled = !selectedLocation;
  selectedHour = null; renderScene(); loadWeather(); loadForecast();
}
function chooseLocation(place) {
  const normalized = WeatherFavorites.normalize(place);
  city.querySelector("option[data-query]")?.remove();
  const option = new Option(normalized.name, "search-result", true, true);
  option.dataset.query = new URLSearchParams({ latitude: normalized.latitude, longitude: normalized.longitude, name: normalized.name }).toString();
  option.dataset.location = JSON.stringify(normalized);
  city.add(option); city.disabled = false; selectCity();
}
document.getElementById("weather-form").addEventListener("submit", (event) => { event.preventDefault(); if (city.disabled) init(); else selectCity(); });
city.addEventListener("change", selectCity);
document.getElementById("forecast-retry").addEventListener("click", loadForecast);

function renderFavorites(message = "") {
  const data = favorites.state();
  text("favorites-status", [message, data.warning].filter(Boolean).join(" "));
  const list = document.getElementById("favorites-list"); list.replaceChildren();
  if (!data.cities.length) { const empty = document.createElement("li"); empty.className = "empty-favorites"; empty.textContent = "Сохраните любимый город — он будет рядом."; list.append(empty); }
  for (const place of data.cities) {
    const li = document.createElement("li"), pick = document.createElement("button"), remove = document.createElement("button");
    pick.type = remove.type = "button"; pick.className = "favorite-pick"; pick.textContent = place.name;
    pick.addEventListener("click", () => chooseLocation(place)); remove.textContent = "×";
    remove.setAttribute("aria-label", `Удалить ${place.name} из избранного`);
    remove.addEventListener("click", () => { favorites.remove(place.id); renderFavorites("Город удалён из избранного."); document.getElementById("add-favorite").focus(); });
    li.append(pick); li.append(remove); list.append(li);
  }
}
document.getElementById("add-favorite").addEventListener("click", () => {
  if (!selectedLocation) return;
  const result = favorites.add(selectedLocation);
  renderFavorites({ added: "Город добавлен.", duplicate: "Город уже в избранном.", limit: "Можно сохранить до 5 городов. Удалите один из списка." }[result.status]);
});
searchInput.addEventListener("input", () => { ++searchNumber; results.replaceChildren(); searchStatus.textContent = ""; });
document.getElementById("search-form").addEventListener("submit", async (event) => {
  event.preventDefault(); const number = ++searchNumber, query = searchInput.value.trim();
  results.replaceChildren(); searchStatus.className = "small-status";
  if (query.length < 2 || query.length > 100) { searchStatus.textContent = "Введите название города: от 2 до 100 символов."; return; }
  searchStatus.textContent = "Ищем города…";
  try {
    const data = await getJSON(`/api/search?${new URLSearchParams({ q: query })}`);
    if (number !== searchNumber) return;
    searchStatus.textContent = data.cities.length ? "Выберите нужный город:" : "Ничего не найдено. Попробуйте другое название.";
    for (const item of data.cities) {
      const label = [item.name, item.region, item.country].filter(Boolean).join(", ");
      const li = document.createElement("li"), button = document.createElement("button");
      button.type = "button"; button.textContent = label;
      button.addEventListener("click", () => { chooseLocation({ ...item, name: label }); ++searchNumber; results.replaceChildren(); searchStatus.textContent = `Выбран город: ${label}`; });
      li.append(button); results.append(li);
    }
  } catch (error) { if (number === searchNumber) { searchStatus.className = "small-status error"; searchStatus.textContent = `Поиск недоступен. ${error.message}`; } }
});
async function init() {
  try {
    refresh.disabled = true;
    const data = await getJSON("/api/cities");
    if (city.querySelector("option[data-query]")) return;
    city.replaceChildren(...data.cities.map((item) => {
      const option = new Option(item.name, item.id);
      if (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) option.dataset.location = JSON.stringify(item);
      return option;
    }));
    city.disabled = false; selectCity();
  } catch { status.textContent = "Не удалось загрузить города. Нажмите «Обновить»."; refresh.disabled = false; }
}
renderFavorites(); applyMotion(); init();
