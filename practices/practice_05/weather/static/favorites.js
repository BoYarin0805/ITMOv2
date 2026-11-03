"use strict";
const WeatherFavorites = (() => {
  const KEY = "weather.favorites.v1";
  const LIMIT = 5;
  function normalize(place) {
    if (!place || typeof place.name !== "string" || !place.name.trim() || place.name.trim().length > 200 ||
        !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) ||
        Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) throw new Error("Некорректный город.");
    const coordinate = (n) => Number(n.toFixed(4)) === 0 ? "0.0000" : n.toFixed(4);
    return { id: `${coordinate(place.latitude)},${coordinate(place.longitude)}`, name: place.name.trim(),
      latitude: place.latitude, longitude: place.longitude };
  }
  function createStore(storage) {
    let cities = [], persistent = true, warning = "";
    const unavailable = "Хранилище недоступно: избранное сохранится только до перезагрузки.";
    try {
      if (!storage) throw new Error("Storage unavailable");
      const raw = storage.getItem(KEY);
      if (raw !== null) {
        const data = JSON.parse(raw);
        if (data.version !== 1 || !Array.isArray(data.cities)) throw new Error("Corrupted favorites");
        for (const item of data.cities) {
          try {
            const place = normalize(item);
            if (cities.length === LIMIT || cities.some((city) => city.id === place.id) || item.id !== place.id) throw new Error("Invalid record");
            cities.push(place);
          } catch { warning = "Некоторые сохранённые города повреждены и пропущены."; }
        }
      }
    } catch {
      warning = storage ? "Не удалось прочитать избранное: данные повреждены или хранение запрещено." : unavailable;
      persistent = false;
    }
    const state = () => ({ cities: cities.map((city) => ({ ...city })), persistent, warning });
    function save() {
      try {
        if (!storage) throw new Error("Storage unavailable");
        storage.setItem(KEY, JSON.stringify({ version: 1, cities }));
        persistent = true; warning = "";
      } catch { persistent = false; warning = unavailable; }
    }
    return {
      state,
      add(place) {
        const city = normalize(place);
        if (cities.some((item) => item.id === city.id)) return { ...state(), status: "duplicate" };
        if (cities.length === LIMIT) return { ...state(), status: "limit" };
        cities.push(city); save();
        return { ...state(), status: "added" };
      },
      remove(id) { cities = cities.filter((city) => city.id !== id); save(); return { ...state(), status: "removed" }; },
    };
  }
  return { KEY, LIMIT, normalize, createStore };
})();
if (typeof module !== "undefined") module.exports = WeatherFavorites;
