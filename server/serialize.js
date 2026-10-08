// Row -> API shapes. Money goes out as US dollars (numbers with cents precision).
export const usd = (c) => Math.round(Number(c)) / 100;

export function category(r) {
  return { id: r.id, name: r.name, icon: r.icon, color: r.color, from: usd(r.from_cents), desc: r.description };
}

export function tasker(r) {
  const skills = r.skills || [];
  return {
    id: r.id,
    userId: r.user_id || null,
    name: r.name,
    first: r.first,
    gradient: r.gradient,
    skills,
    rating: Number(r.rating),
    jobs: r.jobs,
    premium: usd(r.premium_cents),
    rate: r.rate_cents != null ? usd(r.rate_cents) : null,
    area: r.area,
    distance: Number(r.distance_km),
    elite: r.elite,
    verified: r.verified,
    responseMins: r.response_mins,
    bio: r.bio,
    languages: r.languages,
    vehicle: r.vehicle,
    online: r.online,
  };
}

export function user(r) {
  return {
    id: r.id,
    phone: r.phone,
    name: r.name,
    area: r.area,
    role: r.role,
    wallet: usd(r.wallet_cents),
    taskerOnline: r.tasker_online,
    createdAt: r.created_at,
  };
}

export function booking(r) {
  return {
    id: r.id,
    taskerId: r.tasker_id,
    categoryId: r.category_id,
    categoryName: r.category_name,
    area: r.area,
    address: r.address,
    details: r.details,
    size: r.size,
    hours: Number(r.hours),
    date: r.date_label,
    slot: r.slot,
    rate: usd(r.rate_cents),
    fee: usd(r.fee_cents),
    discount: usd(r.discount_cents),
    credit: usd(r.credit_cents),
    total: usd(r.total_cents),
    promoCode: r.promo_code,
    payment: r.payment_name || r.payment_method,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status || null,
    status: r.status,
    rated: r.rating,
    review: r.review,
    tip: usd(r.tip_cents),
    createdAt: r.created_at,
  };
}

export function message(r) {
  return { id: r.id, taskerId: r.tasker_id, clientId: r.client_id, from: r.sender, text: r.body, at: new Date(r.created_at).getTime(), read: !!r.read_at };
}

export function notification(r) {
  return { id: r.id, kind: r.kind, text: r.body, read: r.read, at: new Date(r.created_at).getTime() };
}

export function job(r) {
  return {
    id: r.id,
    client: r.client_name,
    cat: r.category_id,
    area: r.area,
    when: r.when_label,
    pay: usd(r.pay_cents),
    dist: Number(r.distance_km),
    status: r.status,
    createdAt: r.created_at,
  };
}
