"use strict";
const write = (id, value) => { document.getElementById(id).textContent = value; };
const pretty = (value) => JSON.stringify(value, null, 2);

async function refreshEvidence() {
  try {
    const response = await fetch("/api/evidence", { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Сервер не вернул результаты.");
    const { skill, mcp, checks, hook_history: history, hook_demo: hookDemo } = await response.json();
    write("evidence-status", "Результаты обновлены.");
    write("skill-summary", skill ? `${skill.status} · ${skill.checks.length} контрольных погодных сценариев и проверки деморежима · ${skill.time}` : "Skill ещё не запускался.");
    write("skill-details", skill ? pretty(skill) : "Нет записи запуска.");
    write("mcp-summary", mcp ? `${mcp.status} · клиент ${mcp.client} · транспорт ${mcp.transport} · ${mcp.time}` : "MCP-демонстрация ещё не запускалась.");
    write("mcp-weather", mcp?.weather ? `${mcp.weather.city.name}: ${mcp.weather.current.temperature_2m} °C, ${mcp.weather.current.description}. Время данных: ${mcp.weather.current.time}.` : "");
    write("mcp-details", mcp ? pretty(mcp) : "Нет записи вызовов.");
    write("checks-summary", checks ? `${checks.status} · событие: ${checks.trigger} · ${checks.finished || checks.started}` : "Автопроверка ещё не запускалась.");
    write("checks-details", checks?.output || "Проверка ещё выполняется или не запускалась.");
    document.getElementById("hook-history").replaceChildren(...history.map((item) => {
      const li = document.createElement("li");
      li.textContent = `${item.status} · ${item.trigger} · ${item.finished}`;
      return li;
    }));
    if (hookDemo?.status === "PASS") {
      const li = document.createElement("li");
      li.textContent = "Сохранённая демонстрация: автоматический FAIL → исправление → автоматический PASS.";
      document.getElementById("hook-history").append(li);
    }
  } catch {
    write("evidence-status", "Не удалось обновить результаты. Проверьте, запущен ли сервер.");
  } finally {
    setTimeout(refreshEvidence, 3000);
  }
}
refreshEvidence();
