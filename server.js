const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = process.env.CARS_FILE || path.join(__dirname, "data", "cars.json");
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_BODY_SIZE = 1024 * 1024;
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function readCars() {
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
}

async function writeCars(cars) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporaryFile = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(cars, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, DATA_FILE);
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
        reject(Object.assign(new Error("So‘rov hajmi juda katta."), { statusCode: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error("So‘rov JSON formatida bo‘lishi kerak."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

async function serveStatic(pathname, response) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const contents = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(contents);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    throw error;
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const carRoute = url.pathname.match(/^\/api\/cars\/([^/]+)$/);

  if (url.pathname === "/api/cars" && request.method === "GET") {
    sendJson(response, 200, await readCars());
    return;
  }

  if (carRoute && (request.method === "PUT" || request.method === "DELETE")) {
    const id = decodeURIComponent(carRoute[1]);
    const cars = await readCars();
    const carIndex = cars.findIndex((car) => String(car.id) === id);
    if (carIndex === -1) {
      sendJson(response, 404, { error: "Avtomobil topilmadi." });
      return;
    }

    if (request.method === "PUT") {
      const body = await readRequestBody(request);
      if (!body || typeof body !== "object" || !Number.isFinite(body.price) || body.price <= 0) {
        sendJson(response, 400, { error: "Narx noldan katta son bo‘lishi kerak." });
        return;
      }
      cars[carIndex].price = Math.round(body.price);
      await writeCars(cars);
      sendJson(response, 200, cars[carIndex]);
      return;
    }

    cars.splice(carIndex, 1);
    await writeCars(cars);
    sendJson(response, 200, { message: "Avtomobil o‘chirildi." });
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendJson(response, 404, { error: "API manzili topilmadi." });
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, { Allow: "GET" });
    response.end("Method not allowed");
    return;
  }

  await serveStatic(decodeURIComponent(url.pathname), response);
}

function createServer() {
  return http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      if (!response.headersSent) {
        sendJson(response, error.statusCode || 500, {
          error: error.statusCode ? error.message : "Serverda xatolik yuz berdi."
        });
      } else {
        response.destroy(error);
      }
      if (!error.statusCode) {
        console.error(error);
      }
    });
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log(`Avtomobillar katalogi ishga tushdi: http://localhost:${PORT}`);
  });
}

module.exports = { createServer };
