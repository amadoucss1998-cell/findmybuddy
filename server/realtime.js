// Tracks open WebSocket connections per user and pushes events to them.
const sockets = new Map(); // userId -> Set<WebSocket>

export function addSocket(userId, ws) {
  if (!sockets.has(userId)) sockets.set(userId, new Set());
  sockets.get(userId).add(ws);
  ws.on("close", () => {
    const set = sockets.get(userId);
    set?.delete(ws);
    if (set && !set.size) sockets.delete(userId);
  });
}

export function emit(userId, type, data) {
  const set = sockets.get(userId);
  if (!set) return;
  const msg = JSON.stringify({ type, data });
  for (const ws of set) if (ws.readyState === 1) ws.send(msg);
}
