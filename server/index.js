import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { openDb } from "./db.js";
import { addSocket } from "./realtime.js";
import { userForToken } from "./util.js";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import bookingRoutes from "./routes/bookings.js";
import socialRoutes from "./routes/social.js";
import walletRoutes from "./routes/wallet.js";
import taskerRoutes from "./routes/tasker.js";

export async function buildApp({ dataDir, logger = true } = {}) {
  await openDb(dataDir);
  const app = Fastify({ logger, trustProxy: true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(websocket);

  app.setErrorHandler((err, req, reply) => {
    const status = err.statusCode || 500;
    if (status >= 500) req.log.error(err);
    reply.status(status).send({ error: status >= 500 ? "Something went wrong" : err.message });
  });

  // Realtime: ws://host/ws?token=... → pushes message, typing, booking and notification events.
  app.get("/ws", { websocket: true }, async (socket, req) => {
    const user = req.query.token ? await userForToken(String(req.query.token)) : null;
    if (!user) return socket.close(4401, "unauthorized");
    addSocket(user.id, socket);
    socket.send(JSON.stringify({ type: "hello", data: { userId: user.id } }));
  });

  await app.register(catalogRoutes);
  await app.register(authRoutes);
  await app.register(bookingRoutes);
  await app.register(socialRoutes);
  await app.register(walletRoutes);
  await app.register(taskerRoutes);

  app.all("/api/*", async (req, reply) => reply.status(404).send({ error: "Not found" }));

  // Serve the built web app in production (single deploy).
  const dist = fileURLToPath(new URL("../dist", import.meta.url));
  if (existsSync(dist)) {
    await app.register(fastifyStatic, { root: dist, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api/")) return reply.sendFile("index.html");
      reply.status(404).send({ error: "Not found" });
    });
  }
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = await buildApp();
  await app.listen({ port: config.port, host: config.host });
  if (config.demo) app.log.warn("DEMO_MODE is on: OTP codes are returned by the API and Taskers auto-reply. Set DEMO_MODE=false in production.");
}
