// Shared helpers that turn database rows into the shapes the UI uses (dollars, camelCase).
import { categories, paymentMethods } from "../data";

export const usd = (cents) => Math.round(Number(cents)) / 100;
export const cents = (dollars) => Math.round(Number(dollars) * 100);
export const sizeHours = { small: 1, medium: 2.5, large: 4 };
export const FEE_RATE = 0.07;

export function ago(ts) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d < 1) return "today";
  if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  const w = Math.floor(d / 7);
  return `${w} week${w > 1 ? "s" : ""} ago`;
}

export const catName = (id) => categories.find((c) => c.id === id)?.name || id;
export const payName = (id) => paymentMethods.find((p) => p.id === id)?.name || id;

export function profile(r) {
  return {
    id: r.id,
    phone: r.phone ? r.phone.replace(/^\+?231/, "+231 ") : "",
    name: r.name,
    area: r.area,
    role: r.role,
    wallet: usd(r.wallet_cents),
    taskerOnline: r.tasker_online,
  };
}

export function booking(r) {
  return {
    id: r.id,
    taskerId: r.tasker_id,
    categoryId: r.category_id,
    categoryName: catName(r.category_id),
    area: r.area,
    address: r.address,
    details: r.details,
    size: r.size,
    hours: Number(r.hours),
    date: r.date_label,
    slot: r.slot,
    rate: usd(r.rate_cents),
    total: usd(r.total_cents),
    credit: usd(r.credit_cents),
    payment: payName(r.payment_method),
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    status: r.status,
    rated: r.rating,
    tip: usd(r.tip_cents || 0),
    createdAt: new Date(r.created_at).getTime(),
  };
}

export function message(r) {
  return {
    id: r.id,
    taskerId: r.tasker_id,
    from: r.sender === "client" ? "me" : "them",
    text: r.body,
    at: new Date(r.created_at).getTime(),
    read: !!r.read_at,
  };
}

export const notification = (r) => ({ id: r.id, kind: r.kind, text: r.body, read: r.read, at: new Date(r.created_at).getTime() });

export const job = (r) => ({
  id: r.id,
  client: r.client_name,
  cat: r.category_id,
  area: r.area,
  when: r.when_label,
  pay: usd(r.pay_cents),
  dist: Number(r.distance_km),
  status: r.status,
});

export const quote = (q) => ({
  rate: usd(q.rate_cents),
  hours: Number(q.hours),
  subtotal: usd(q.subtotal_cents),
  fee: usd(q.fee_cents),
  discount: usd(q.discount_cents),
  credit: usd(q.credit_cents),
  total: usd(q.total_cents),
  promo: q.promo || null,
});

const LABEL = { booking: "Task payment", topup: "Wallet top up", tip: "Tip", payout: "Cash out", bonus: "Welcome bonus" };
export function payment(p) {
  const incoming = ["topup", "bonus"].includes(p.kind) || p.status === "refunded";
  return {
    id: p.id,
    title: p.booking_category ? `${catName(p.booking_category)}${p.kind === "tip" ? " · tip" : ""}` : LABEL[p.kind],
    sub: `${p.method === "wallet" ? "LoneStar credit" : payName(p.method)} · ${p.status}`,
    amount: (incoming ? 1 : -1) * usd(p.amount_cents),
    at: new Date(p.created_at).getTime(),
  };
}

export function normalizePhone(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("231")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[2-9]\d{6,8}$/.test(d) ? `+231${d}` : null;
}
