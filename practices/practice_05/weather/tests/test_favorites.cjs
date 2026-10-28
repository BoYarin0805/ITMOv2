const { test } = require("node:test");
const assert = require("node:assert/strict");
const { KEY, normalize, createStore } = require("../static/favorites.js");
const place = (n = 1) => ({ name: `Город ${n}`, latitude: n, longitude: n });
function memory(initial = null) {
  return { value: initial, writes: 0, getItem() { return this.value; }, setItem(key, value) { assert.equal(key, KEY); this.value = value; this.writes++; } };
}
test("favorites persist, deduplicate by coordinates, preserve order and cap at five", () => {
  const storage = memory(), store = createStore(storage);
  for (let n = 1; n <= 5; n++) assert.equal(store.add(place(n)).status, "added");
  assert.equal(store.add({ ...place(), name: "Другое написание" }).status, "duplicate");
  assert.equal(store.add(place(6)).status, "limit");
  assert.deepEqual(createStore(storage).state().cities.map((city) => city.name), [1,2,3,4,5].map((n) => `Город ${n}`));
  store.remove("1.0000,1.0000");
  assert.equal(createStore(storage).state().cities.length, 4);
});
test("invalid coordinates rejected and negative zero normalized", () => {
  for (const latitude of [NaN, Infinity, 91, true, "1"]) assert.throws(() => normalize({ ...place(), latitude }));
  assert.equal(normalize({ ...place(), latitude: -0.00001, longitude: 0 }).id, "0.0000,0.0000");
});
test("corrupt storage never writes during load and retains valid records", () => {
  for (const value of ["not json", "null", '{"version":2,"cities":[]}']) {
    const storage = memory(value), store = createStore(storage);
    assert.equal(store.state().cities.length, 0); assert.ok(store.state().warning); assert.equal(storage.writes, 0);
  }
  const storage = memory(JSON.stringify({ version: 1, cities: [null, normalize(place()), { name: "bad" }] }));
  assert.equal(createStore(storage).state().cities.length, 1); assert.equal(storage.writes, 0);
});
test("storage denied retains session changes and warns", () => {
  const storage = { getItem() { throw new Error("Denied"); }, setItem() { throw new Error("Denied"); } };
  const store = createStore(storage);
  const result = store.add(place());
  assert.equal(result.status, "added"); assert.equal(result.persistent, false); assert.equal(result.cities.length, 1);
  assert.match(result.warning, /только до перезагрузки/);
  assert.equal(store.remove(result.cities[0].id).cities.length, 0);
});
