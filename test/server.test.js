const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const temporaryDirectory = path.join(os.tmpdir(), `car-catalog-test-${process.pid}`);
process.env.CARS_FILE = path.join(temporaryDirectory, "cars.json");
const { createServer } = require("../server");

let server;
let baseUrl;

test.before(async () => {
  await fs.mkdir(temporaryDirectory, { recursive: true });
  await fs.writeFile(process.env.CARS_FILE, JSON.stringify([
    { id: "car-1", name: "Test car", price: 100000, category: "Sedan" },
    { id: "car-2", name: "Other car", price: 200000, category: "SUV" }
  ]));
  server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await fs.rm(temporaryDirectory, { recursive: true, force: true });
});

test("PUT updates the price and the new price persists when the list is fetched again", async () => {
  const updateResponse = await fetch(`${baseUrl}/api/cars/car-1`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price: 350000 })
  });
  assert.equal(updateResponse.status, 200);
  assert.equal((await updateResponse.json()).price, 350000);

  const listResponse = await fetch(`${baseUrl}/api/cars`);
  assert.equal(listResponse.status, 200);
  const cars = await listResponse.json();
  assert.equal(cars.find((car) => car.id === "car-1").price, 350000);
});

test("PUT rejects invalid prices without changing the saved car", async () => {
  for (const body of [{ price: 0 }, null, { name: "No price" }]) {
    const response = await fetch(`${baseUrl}/api/cars/car-1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "Narx noldan katta son bo‘lishi kerak.");
  }

  const cars = await (await fetch(`${baseUrl}/api/cars`)).json();
  assert.equal(cars.find((car) => car.id === "car-1").price, 350000);
});

test("DELETE removes the selected car from the persisted catalog", async () => {
  const response = await fetch(`${baseUrl}/api/cars/car-2`, { method: "DELETE" });
  assert.equal(response.status, 200);

  const cars = await (await fetch(`${baseUrl}/api/cars`)).json();
  assert.deepEqual(cars.map((car) => car.id), ["car-1"]);
});

test("API returns 404 for a car that does not exist", async () => {
  const response = await fetch(`${baseUrl}/api/cars/missing`, { method: "DELETE" });
  assert.equal(response.status, 404);
});
