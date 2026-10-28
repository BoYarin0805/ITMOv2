"use strict";
const WeatherScene = (() => {
  const stateForScene = typeof module !== "undefined" ? require("./weather-state.js").weatherState : weatherState;
  function selectLandscape({ code, isDay, month, latitude = 0, season = "auto" }) {
    const state = stateForScene(code, isDay);
    const adjusted = latitude < 0 ? ((month + 5) % 12) + 1 : month;
    const currentSeason = season !== "auto" ? season : [12, 1, 2].includes(adjusted) ? "winter"
      : [3, 4, 5].includes(adjusted) ? "spring" : [6, 7, 8].includes(adjusted) ? "summer" : "autumn";
    const clip = isDay === 0 ? "night" : state.kind === "snow" ? "winter"
      : ["rain", "storm"].includes(state.kind) ? "rain" : currentSeason;
    return { clip, season: currentSeason, kind: state.kind, night: isDay === 0 };
  }
  return { selectLandscape };
})();
if (typeof module !== "undefined") module.exports = WeatherScene;
