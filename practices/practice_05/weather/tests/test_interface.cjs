// Проверяем взаимодействия JS с минимальной моделью DOM, без браузера и сети.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function fixture() {
  class Element {
    constructor() { this.children = []; this.dataset = {}; this.listeners = {}; this.value = ""; this.textContent = ""; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    append(child) { this.children.push(child); }
    add(child) { this.append(child); this.value = child.value; }
    replaceChildren(...children) { this.children = children; this.value = children[0]?.value || ""; }
    get selectedOptions() { return this.children.filter((child) => child.value === this.value); }
    querySelector() { return this.children.find((child) => child.dataset.query); }
    setAttribute(name, value) { this[name] = value; }
    pause() {}
    play() { return Promise.resolve(); }
    load() {}
    focus() {}
  }
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  get("scenario").value = "live";
  get("season").value = "auto";
  const pending = [];
  const context = vm.createContext({
    document: { querySelector: (selector) => get(selector.slice(1)), getElementById: get, createElement: () => new Element() },
    Option: class extends Element { constructor(label, value) { super(); this.textContent = label; this.value = value; } },
    fetch: (url) => new Promise((resolve) => pending.push({ url, respond: (data) => resolve({ ok: true, json: async () => data }) })),
    AbortSignal, URLSearchParams, Intl,
  });
  for (const file of ["weather-state.js", "scene.js", "favorites.js", "app.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "../static", file), "utf8"), context);
  }
  return { get, pending, submit: () => get("search-form").listeners.submit({ preventDefault() {} }) };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("demo works without live weather and never creates a fake weather card", () => {
  const { get } = fixture();
  get("weather").hidden = true;
  get("scenario").value = "snow-night";
  get("scenario").listeners.change();
  assert.match(get("scene-label").textContent, /Снег · Ночь/);
  assert.match(get("scene-mode").textContent, /ДЕМОНСТРАЦИЯ/);
  assert.equal(get("weather").hidden, true);
  get("scenario").value = "live";
  get("scenario").listeners.change();
  assert.equal(get("scene-label").textContent, "Нет текущих данных");
});

test("a late search response cannot replace a newer result", async () => {
  const { get, pending, submit } = fixture();
  get("search").value = "Москва";
  const first = submit();
  get("search").value = "Выборг";
  const second = submit();
  pending[2].respond({ cities: [{ name: "Выборг", country: "Россия", region: "Ленинградская область", latitude: 60.7, longitude: 28.75 }] });
  await second;
  pending[1].respond({ cities: [] });
  await first;
  assert.match(get("search-results").children[0].children[0].textContent, /Выборг/);
  assert.match(get("search-status").textContent, /Выберите/);
  get("search-results").children[0].children[0].listeners.click();
  assert.match(pending[3].url, /latitude=60.7/);
  assert.match(pending[3].url, /longitude=28.75/);
  await tick();
});

test("demo preserves loaded temperature and returning to live restores the city state", async () => {
  const { get, pending } = fixture();
  pending[0].respond({ cities: [{ id: "spb", name: "Санкт-Петербург" }] });
  await tick();
  pending[1].respond({ city: { name: "Санкт-Петербург" }, timezone: "Europe/Moscow",
    current: { temperature_2m: 12, apparent_temperature: 10, relative_humidity_2m: 70,
      wind_speed_10m: 3, description: "Ясно", weather_code: 0, is_day: 1, time: "2026-10-26T12:00" } });
  await tick();
  const temperature = get("temperature").textContent;
  assert.match(get("scene-label").textContent, /Ясно · День/);
  get("scenario").value = "snow-night";
  get("scenario").listeners.change();
  assert.match(get("scene-label").textContent, /Снег · Ночь/);
  assert.equal(get("temperature").textContent, temperature);
  assert.equal(get("weather").hidden, false);
  get("scenario").value = "live";
  get("scenario").listeners.change();
  assert.match(get("scene-label").textContent, /Ясно · День/);
  assert.equal(get("temperature").textContent, temperature);
});
