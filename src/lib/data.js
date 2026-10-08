// Seed data for LoneStar Tasks — everything here is local/mock so the app
// works fully offline. Prices are in USD with an approximate LRD conversion.

export const LRD_RATE = 190; // approx. Liberian dollars per US dollar

export const neighborhoods = [
  "Sinkor", "Mamba Point", "Congo Town", "Paynesville", "Old Road", "Red Light",
  "Duala", "Bushrod Island", "Gardnersville", "ELWA", "Kakata", "Buchanan",
  "Gbarnga", "Harper", "Ganta", "Voinjama", "Zwedru", "Robertsport",
];

export const categories = [
  { id: "cleaning", name: "House Cleaning", icon: "Sparkles", color: "#22C55E", from: 12, desc: "Deep cleans, move-out cleans & regular tidying" },
  { id: "handyman", name: "Handyman", icon: "Hammer", color: "#F59E0B", from: 15, desc: "Repairs, fixing doors, locks & furniture" },
  { id: "moving", name: "Moving Help", icon: "Truck", color: "#3B82F6", from: 25, desc: "Pickup trucks, loaders & packing help" },
  { id: "delivery", name: "Delivery & Errands", icon: "Bike", color: "#EF4444", from: 5, desc: "Keke & motorbike runs across town" },
  { id: "generator", name: "Generator Repair", icon: "Bolt", color: "#EAB308", from: 18, desc: "Servicing, wiring & fuel system fixes" },
  { id: "plumbing", name: "Plumbing", icon: "Droplets", color: "#06B6D4", from: 15, desc: "Leaks, pipes, polytanks & pumps" },
  { id: "electrical", name: "Electrical", icon: "Plug", color: "#8B5CF6", from: 15, desc: "Wiring, sockets, LEC meters & solar" },
  { id: "solar", name: "Solar Install", icon: "Sun", color: "#F97316", from: 40, desc: "Panels, inverters & battery setups" },
  { id: "braiding", name: "Hair & Braiding", icon: "Scissors", color: "#EC4899", from: 10, desc: "Braids, cornrows, barbering at home" },
  { id: "tailoring", name: "Tailoring", icon: "Shirt", color: "#14B8A6", from: 8, desc: "Lappa suits, alterations & uniforms" },
  { id: "carwash", name: "Car Wash", icon: "Car", color: "#0EA5E9", from: 6, desc: "Mobile wash & interior detailing" },
  { id: "laundry", name: "Laundry", icon: "Wind", color: "#6366F1", from: 5, desc: "Wash, iron & fold — pickup & drop" },
  { id: "tutoring", name: "Tutoring", icon: "GraduationCap", color: "#84CC16", from: 8, desc: "WAEC prep, math, English & science" },
  { id: "cooking", name: "Cooking & Catering", icon: "ChefHat", color: "#F43F5E", from: 15, desc: "Jollof, palm butter, events & parties" },
  { id: "painting", name: "Painting", icon: "Paintbrush", color: "#A855F7", from: 20, desc: "Interior, exterior & fences" },
  { id: "ac", name: "AC & Fridge Repair", icon: "Fan", color: "#38BDF8", from: 18, desc: "Gas refill, servicing & installation" },
  { id: "phone", name: "Phone Repair", icon: "Smartphone", color: "#64748B", from: 5, desc: "Screens, batteries & charging ports" },
  { id: "yard", name: "Yard Work", icon: "Leaf", color: "#16A34A", from: 10, desc: "Brushing, cutting grass & gardening" },
  { id: "furniture", name: "Furniture Assembly", icon: "Sofa", color: "#D97706", from: 15, desc: "Beds, wardrobes, desks & shelves" },
  { id: "events", name: "Event Help", icon: "PartyPopper", color: "#DB2777", from: 20, desc: "Setup, decor, MC & DJs" },
  { id: "tv", name: "TV Mounting", icon: "Tv", color: "#475569", from: 12, desc: "Wall mounts, decoders & dish setup" },
  { id: "babysitting", name: "Babysitting", icon: "Baby", color: "#FB7185", from: 8, desc: "Trusted, vetted child care" },
];

export const popularIds = ["cleaning", "generator", "moving", "delivery", "plumbing", "braiding", "solar", "ac"];

export const firstNames = [
  "Musu", "Kollie", "Fatu", "Emmanuel", "Comfort", "Prince", "Hawa", "Josephine", "Moses",
  "Bendu", "Varney", "Garmai", "Augustine", "Mamie", "Sekou", "Precious", "Abraham", "Korpu",
  "Alphonso", "Satta", "Jallah", "Massa", "Patrick", "Weade",
];
export const lastNames = [
  "Kamara", "Doe", "Johnson", "Sirleaf", "Taylor", "Kollie", "Flomo", "Kpoto", "Sackor",
  "Weah", "Toe", "Gbowee", "Cooper", "Massaquoi", "Nyumah", "Kromah", "Davies", "Zinnah",
];

const reviewTexts = [
  "Came on time and did a fantastic job. Will book again!",
  "Very professional and respectful. My house never looked this good.",
  "Fixed my generator in under an hour. Real expert!",
  "Fair price and great communication on WhatsApp.",
  "Handled everything carefully, nothing broken. Highly recommend.",
  "Friendly, honest and hard working. God bless!",
  "Went above and beyond — even cleaned up after.",
  "Quick response even during rainy season. Thank you!",
];

const bios = [
  "Born and raised in Monrovia. I take pride in honest work and treating your home like my own.",
  "5+ years experience. I bring my own tools and always show up on time — rain or shine.",
  "Trained at Booker Washington Institute. Safety first, quality always.",
  "Small business owner serving Montserrado families. Your satisfaction is my advertisement.",
  "Reliable, careful and fast. I've helped 200+ families across Sinkor and Paynesville.",
];

// Deterministic pseudo-random so the seed data is stable between reloads.
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const gradients = [
  ["#FF6B6B", "#FFB86B"], ["#4F8CFF", "#7B5CFF"], ["#22C55E", "#14B8A6"],
  ["#F472B6", "#A855F7"], ["#F59E0B", "#EF4444"], ["#06B6D4", "#3B82F6"],
  ["#84CC16", "#22C55E"], ["#FB7185", "#F97316"],
];

export const taskers = Array.from({ length: 36 }, (_, i) => {
  const r = rng(i * 7 + 3);
  const first = firstNames[i % firstNames.length];
  const last = lastNames[(i * 5) % lastNames.length];
  const primary = categories[i % categories.length];
  const secondary = categories[(i * 3 + 5) % categories.length];
  const tertiary = categories[(i * 7 + 2) % categories.length];
  const skills = [...new Set([primary.id, secondary.id, tertiary.id])];
  const rating = Math.round((4.5 + r() * 0.5) * 10) / 10;
  const jobs = Math.floor(20 + r() * 480);
  const premium = Math.round(r() * 12);
  const rate = primary.from + premium;
  const reviews = Array.from({ length: 4 }, (_, k) => ({
    id: `${i}-${k}`,
    name: `${firstNames[(i + k + 4) % firstNames.length]} ${lastNames[(i + k) % lastNames.length][0]}.`,
    rating: k === 3 && r() > 0.6 ? 4 : 5,
    text: reviewTexts[(i + k) % reviewTexts.length],
    when: `${k + 1}${k === 0 ? " day" : " weeks"} ago`,
    category: categories.find((c) => c.id === skills[k % skills.length]).name,
  }));
  return {
    id: `t${i}`,
    name: `${first} ${last}`,
    first,
    gradient: gradients[i % gradients.length],
    skills,
    rating,
    jobs,
    rate,
    premium,
    area: neighborhoods[i % 10],
    distance: Math.round((0.4 + r() * 8) * 10) / 10,
    elite: r() > 0.7,
    verified: r() > 0.15,
    responseMins: Math.floor(5 + r() * 40),
    bio: bios[i % bios.length],
    languages: r() > 0.5 ? ["English", "Liberian Kreyol", "Kpelle"] : ["English", "Liberian Kreyol", "Bassa"],
    vehicle: ["moving", "delivery"].includes(primary.id) ? (r() > 0.5 ? "Pickup truck" : "Motorbike") : null,
    online: r() > 0.4,
    reviews,
  };
});

export const taskersFor = (catId) => taskers.filter((t) => t.skills.includes(catId));

// Hourly rate a Tasker charges for a given category.
export const rateFor = (t, catId) => {
  const c = categories.find((x) => x.id === (catId || t.skills[0]));
  return c.from + t.premium;
};

export const taskSizes = [
  { id: "small", label: "Small", hint: "Est. 1 hr", hours: 1 },
  { id: "medium", label: "Medium", hint: "Est. 2–3 hrs", hours: 2.5 },
  { id: "large", label: "Large", hint: "Est. 4+ hrs", hours: 4 },
];

export const timeSlots = ["Morning · 8am–12pm", "Afternoon · 12pm–4pm", "Evening · 4pm–7pm", "I'm flexible"];

export const paymentMethods = [
  { id: "orange", name: "Orange Money", sub: "077 ••• 4821", color: "#FF7900", short: "OM" },
  { id: "mtn", name: "MTN MoMo", sub: "088 ••• 1930", color: "#FFCC00", short: "MoMo" },
  { id: "card", name: "Visa •••• 4242", sub: "Expires 08/28", color: "#1A1F71", short: "VISA" },
  { id: "cash", name: "Cash (USD / LRD)", sub: "Pay Tasker after job", color: "#16A34A", short: "$" },
];

export const promos = [
  { title: "Rainy season ready", sub: "Roof & gutter repairs from $15", cat: "handyman", colors: ["#1B3C8C", "#4F8CFF"] },
  { title: "Power your home", sub: "Solar installs — 10% off this month", cat: "solar", colors: ["#FF9F1C", "#FF4D5E"] },
  { title: "Back to school", sub: "WAEC tutors near you", cat: "tutoring", colors: ["#14B8A6", "#22C55E"] },
];

export const cannedReplies = [
  "Hello! Thanks for booking 🙏 I'm on my way.",
  "No problem at all, I'll bring everything needed.",
  "I'm around the junction now, 10 minutes away.",
  "Okay my person, see you soon!",
  "Yes, that works for me. Let me know if anything changes.",
];

export const fmtUSD = (n) => `$${Number(n).toFixed(n % 1 ? 2 : 0)}`;
export const fmtLRD = (n) => `L$${Math.round(n * LRD_RATE).toLocaleString()}`;
