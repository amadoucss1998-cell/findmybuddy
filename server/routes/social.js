import { config } from "../config.js";
import { newId, one, query } from "../db.js";
import { emit } from "../realtime.js";
import { message as serializeMessage, notification } from "../serialize.js";
import { fail, requireUser } from "../util.js";
import { cannedReplies } from "../../src/lib/data.js";
import { getTasker } from "./catalog.js";

// Inserts a client→tasker message. In demo mode, seeded Taskers (no linked account)
// send a canned reply after a short delay so chat feels alive.
export async function sendFromClient(user, tasker, text) {
  const row = await one(
    "INSERT INTO messages (id, client_id, tasker_id, sender, body) VALUES ($1,$2,$3,'client',$4) RETURNING *",
    [newId("m_"), user.id, tasker.id, text]
  );
  emit(user.id, "message", serializeMessage(row));
  if (config.demo && !tasker.userId) {
    emit(user.id, "typing", { taskerId: tasker.id });
    setTimeout(async () => {
      try {
        const reply = await one(
          "INSERT INTO messages (id, client_id, tasker_id, sender, body) VALUES ($1,$2,$3,'tasker',$4) RETURNING *",
          [newId("m_"), user.id, tasker.id, cannedReplies[Math.floor(Math.random() * cannedReplies.length)]]
        );
        emit(user.id, "message", serializeMessage(reply));
      } catch {
        /* user may have been deleted meanwhile */
      }
    }, 1500 + Math.random() * 1500);
  }
  return row;
}

export default async function socialRoutes(app) {
  app.addHook("preHandler", requireUser);

  app.get("/api/threads", async (req) => {
    const rows = await query(
      `SELECT DISTINCT ON (m.tasker_id) m.*,
         (SELECT count(*)::int FROM messages u WHERE u.client_id = m.client_id AND u.tasker_id = m.tasker_id
            AND u.sender = 'tasker' AND u.read_at IS NULL) AS unread
       FROM messages m WHERE m.client_id = $1
       ORDER BY m.tasker_id, m.created_at DESC`,
      [req.user.id]
    );
    const threads = rows
      .map((r) => ({ taskerId: r.tasker_id, last: serializeMessage(r), unread: r.unread }))
      .sort((a, b) => b.last.at - a.last.at);
    return { threads };
  });

  app.get("/api/threads/:taskerId/messages", async (req) => {
    const rows = await query(
      "SELECT * FROM messages WHERE client_id = $1 AND tasker_id = $2 ORDER BY created_at LIMIT 500",
      [req.user.id, req.params.taskerId]
    );
    await query(
      "UPDATE messages SET read_at = now() WHERE client_id = $1 AND tasker_id = $2 AND sender = 'tasker' AND read_at IS NULL",
      [req.user.id, req.params.taskerId]
    );
    return { messages: rows.map(serializeMessage) };
  });

  app.post(
    "/api/threads/:taskerId/messages",
    {
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
      schema: { body: { type: "object", required: ["text"], properties: { text: { type: "string", minLength: 1, maxLength: 1000 } } } },
    },
    async (req) => {
      const tasker = await getTasker(req.params.taskerId);
      if (!tasker) throw fail(404, "Tasker not found");
      const row = await sendFromClient(req.user, tasker, req.body.text.trim());
      return { message: serializeMessage(row) };
    }
  );

  app.post("/api/threads/:taskerId/read", async (req) => {
    await query(
      "UPDATE messages SET read_at = now() WHERE client_id = $1 AND tasker_id = $2 AND sender = 'tasker' AND read_at IS NULL",
      [req.user.id, req.params.taskerId]
    );
    return { ok: true };
  });

  app.get("/api/notifications", async (req) => {
    const rows = await query("SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50", [req.user.id]);
    return { notifications: rows.map(notification) };
  });

  app.post("/api/notifications/read", async (req) => {
    await query("UPDATE notifications SET read = TRUE WHERE user_id = $1 AND NOT read", [req.user.id]);
    return { ok: true };
  });

  app.get("/api/favorites", async (req) => {
    const rows = await query("SELECT tasker_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
    return { favorites: rows.map((r) => r.tasker_id) };
  });

  app.put("/api/favorites/:taskerId", async (req) => {
    const t = await one("SELECT id FROM taskers WHERE id = $1", [req.params.taskerId]);
    if (!t) throw fail(404, "Tasker not found");
    await query("INSERT INTO favorites (user_id, tasker_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.user.id, t.id]);
    return { ok: true };
  });

  app.delete("/api/favorites/:taskerId", async (req) => {
    await query("DELETE FROM favorites WHERE user_id = $1 AND tasker_id = $2", [req.user.id, req.params.taskerId]);
    return { ok: true };
  });
}
