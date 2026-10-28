"use strict";
// Одна функция для реальных данных и сценариев демонстрации.
function weatherState(code, isDay) {
  const groups = [
    ["clear", "Ясно", [0, 1]], ["cloudy", "Облачно", [2, 3]],
    ["fog", "Туман", [45, 48]],
    ["rain", "Дождь", [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]],
    ["snow", "Снег", [71, 73, 75, 77, 85, 86]],
    ["storm", "Гроза", [95, 96, 99]],
  ];
  const [kind, label] = groups.find((group) => group[2].includes(code)) || ["unknown", "Неизвестные условия"];
  const daytime = isDay === 1 ? "День" : isDay === 0 ? "Ночь" : "Время суток неизвестно";
  const icon = { clear: isDay === 0 ? "🌙" : "☀️", cloudy: "☁️", fog: "🌫️", rain: "🌧️", snow: "❄️", storm: "⛈️", unknown: "❔" }[kind];
  return { kind, label, daytime, icon };
}

if (typeof module !== "undefined") module.exports = { weatherState };
