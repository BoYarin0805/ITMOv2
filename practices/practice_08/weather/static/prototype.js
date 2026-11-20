"use strict";

const search = document.getElementById("prototype-search");
const query = document.getElementById("prototype-query");
const submit = document.getElementById("prototype-submit");
const status = document.getElementById("prototype-status");
const result = document.getElementById("prototype-result");
const stateButtons = [...document.querySelectorAll("[data-view]")];
const defaultPlace = "Санкт-Петербург";
let pending;

const views = {
  start: { query: "" },
  entry: { query: "Выборг" },
  invalid: { query: "В", message: "Введите название города: от 2 до 100 символов.", variant: "danger" },
  loading: { query: "Выборг", message: "Ищем города…", variant: "info" },
  results: { query: "Выборг", message: "Выберите нужный город:" },
  empty: { query: "Небоград", message: "Ничего не найдено. Попробуйте другое название.", variant: "warning" },
  error: { query: "Выборг", message: "Поиск недоступен. Попробуйте ещё раз.", variant: "danger" },
  selected: { query: "Выборг", message: `Выбран город: ${result.textContent}` },
};

function showView(name, value = views[name].query) {
  clearTimeout(pending);
  const view = views[name];
  const loading = name === "loading";
  const selected = name === "selected";
  const invalid = name === "invalid";
  const place = selected ? result.textContent : defaultPlace;

  query.value = value;
  query.classList.toggle("is-invalid", invalid);
  query.setAttribute("aria-invalid", String(invalid));
  submit.disabled = loading;
  search.setAttribute("aria-busy", String(loading));
  status.className = view.variant ? `search-feedback alert alert-${view.variant}` : "search-feedback";
  status.dataset.state = view.message ? name : "idle";
  document.getElementById("prototype-spinner").hidden = !loading;
  document.getElementById("prototype-message").textContent = view.message || "";
  document.getElementById("prototype-results").hidden = name !== "results";
  document.getElementById("prototype-city").textContent = place;
  document.getElementById("prototype-selected-city").textContent = place;
  document.getElementById("prototype-temperature").textContent = selected ? "10 °C" : "12 °C";

  for (const button of stateButtons) {
    const active = button.dataset.view === name;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("active", active);
  }
}

for (const button of stateButtons) button.addEventListener("click", () => showView(button.dataset.view));
query.addEventListener("input", () => showView("entry", query.value));
search.addEventListener("submit", (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  const value = query.value.trim();
  if ([...value].length < 2) {
    showView("invalid", value);
    return;
  }
  showView("loading", value);
  pending = setTimeout(() => showView(/^выборг$/i.test(value) ? "results" : "empty", value), 650);
});
result.addEventListener("click", () => showView("selected"));
showView("start");
