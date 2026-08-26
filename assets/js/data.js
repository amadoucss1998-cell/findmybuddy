/* ============================================================
   Find My Buddy — Seed data (Liberia-localized)
   Exposed on window.FMB_DATA
   ============================================================ */
(function () {
  const COUNTIES = [
    "Montserrado", "Nimba", "Bong", "Grand Bassa", "Lofa", "Margibi",
    "Grand Gedeh", "Maryland", "Sinoe", "Bomi", "Grand Cape Mount",
    "Gbarpolu", "River Cess", "River Gee", "Grand Kru"
  ];

  // interest catalog: id, label, emoji, gradient colors
  const INTERESTS = [
    { id: "football",   label: "Football",       emoji: "⚽", c: ["#16a34a", "#065f46"] },
    { id: "music",      label: "Music & DJ",     emoji: "🎧", c: ["#7c3aed", "#4c1d95"] },
    { id: "tech",       label: "Tech & Coding",  emoji: "💻", c: ["#2563eb", "#1e3a8a"] },
    { id: "business",   label: "Business",       emoji: "💼", c: ["#0f766e", "#134e4a"] },
    { id: "food",       label: "Food & Cooking", emoji: "🍲", c: ["#ea580c", "#9a3412"] },
    { id: "fashion",    label: "Fashion",        emoji: "👗", c: ["#db2777", "#831843"] },
    { id: "faith",      label: "Faith",          emoji: "🙏", c: ["#4f46e5", "#312e81"] },
    { id: "art",        label: "Art & Craft",    emoji: "🎨", c: ["#e11d48", "#881337"] },
    { id: "dance",      label: "Dance",          emoji: "💃", c: ["#c026d3", "#701a75"] },
    { id: "gaming",     label: "Gaming",         emoji: "🎮", c: ["#0891b2", "#164e63"] },
    { id: "fitness",    label: "Fitness",        emoji: "🏋️", c: ["#dc2626", "#7f1d1d"] },
    { id: "reading",    label: "Reading",        emoji: "📚", c: ["#0d9488", "#115e59"] },
    { id: "farming",    label: "Farming",        emoji: "🌾", c: ["#65a30d", "#365314"] },
    { id: "photography",label: "Photography",    emoji: "📸", c: ["#475569", "#1e293b"] },
    { id: "movies",     label: "Movies",         emoji: "🎬", c: ["#9333ea", "#581c87"] },
    { id: "volunteer",  label: "Volunteering",   emoji: "🤝", c: ["#0284c7", "#075985"] },
    { id: "basketball", label: "Basketball",     emoji: "🏀", c: ["#f59e0b", "#b45309"] },
    { id: "travel",     label: "Travel",         emoji: "🧳", c: ["#0ea5e9", "#0c4a6e"] },
  ];

  const AV_COLORS = ["#4f46e5","#e11d48","#0891b2","#16a34a","#d97706","#7c3aed","#db2777","#0d9488","#dc2626","#2563eb"];

  // Sample people already on the platform
  const PEOPLE = [
    { id: "u_ama",    name: "Ama Kollie",     county: "Montserrado", bio: "Frontend dev learning React. Love jollof and code.", interests: ["tech","food","music"], verified: true },
    { id: "u_moses",  name: "Moses Tarnue",   county: "Nimba",       bio: "Striker for the community team. Always down for a match.", interests: ["football","fitness","faith"] },
    { id: "u_grace",  name: "Grace Weah",     county: "Montserrado", bio: "Fashion entrepreneur building a brand from Monrovia.", interests: ["fashion","business","art"], verified: true },
    { id: "u_prince", name: "Prince Doe",     county: "Margibi",     bio: "DJ + producer. Let's make some noise this weekend.", interests: ["music","dance","gaming"] },
    { id: "u_fatu",   name: "Fatu Sherif",    county: "Bong",        bio: "Nurse and volunteer. Reading is my quiet time.", interests: ["volunteer","reading","faith"] },
    { id: "u_jc",     name: "J.C. Nyenpan",   county: "Grand Gedeh", bio: "Cassava & vegetable farmer. Teaching youth agriculture.", interests: ["farming","business","volunteer"] },
    { id: "u_kebeh",  name: "Kebeh Johnson",  county: "Montserrado", bio: "Photographer capturing Liberian life. Open for collabs.", interests: ["photography","art","travel"], verified: true },
    { id: "u_emma",   name: "Emmanuel Boyd",  county: "Grand Bassa", bio: "Backend engineer. Coffee, Python, and pickup basketball.", interests: ["tech","basketball","gaming"] },
    { id: "u_musu",   name: "Musu Kamara",    county: "Lofa",        bio: "Dance instructor. Afrobeats and traditional moves.", interests: ["dance","music","fitness"] },
    { id: "u_saah",   name: "Saah Gongloe",   county: "Nimba",       bio: "Small business owner. Let's talk hustle and growth.", interests: ["business","football","faith"] },
    { id: "u_bendu",  name: "Bendu Massaquoi",county: "Montserrado", bio: "Chef running a supper club. Food brings people together.", interests: ["food","business","travel"], verified: true },
    { id: "u_tommy",  name: "Tommy Brown",    county: "Margibi",     bio: "Gamer & streamer. FIFA nights every Friday.", interests: ["gaming","football","movies"] },
    { id: "u_hawa",   name: "Hawa Konneh",    county: "Bong",        bio: "Bookworm & aspiring writer. Starting a book club.", interests: ["reading","art","faith"] },
    { id: "u_alpha",  name: "Alpha Kromah",   county: "Montserrado", bio: "Startup founder in fintech. Building for Liberia.", interests: ["tech","business","reading"], verified: true },
    { id: "u_deddeh", name: "Deddeh Toe",     county: "Grand Bassa", bio: "Fitness coach. Free morning runs on the beach.", interests: ["fitness","food","dance"] },
    { id: "u_sam",    name: "Sam Wolo",       county: "Maryland",    bio: "Football coach for the youth league. Faith & family.", interests: ["football","faith","volunteer"] },
  ];

  // Activity templates -> converted to dated activities at load time
  const ACTIVITY_SEED = [
    { title: "Saturday Pickup Football", interest: "football", host: "u_moses", county: "Nimba", location: "Sanniquellie Community Field", inDays: 2, hour: 16, cap: 22, priceLRD: 0, desc: "Casual 11-a-side. Bring water and good vibes. All skill levels welcome!" },
    { title: "React & JavaScript Meetup", interest: "tech", host: "u_alpha", county: "Montserrado", location: "iLab Liberia, Monrovia", inDays: 5, hour: 15, cap: 40, priceLRD: 0, desc: "Monthly dev meetup. This month: building your first React app + networking." },
    { title: "Afrobeats Dance Class", interest: "dance", host: "u_musu", county: "Lofa", location: "Voinjama Youth Center", inDays: 3, hour: 17, cap: 30, priceLRD: 300, desc: "Learn the latest Afrobeats choreography. Beginners very welcome." },
    { title: "Monrovia Supper Club", interest: "food", host: "u_bendu", county: "Montserrado", location: "Sinkor, 12th Street", inDays: 6, hour: 19, cap: 16, priceLRD: 1500, desc: "3-course Liberian fusion dinner + new friends around one table." },
    { title: "Sunday Morning Beach Run", interest: "fitness", host: "u_deddeh", county: "Grand Bassa", location: "Buchanan Beach", inDays: 4, hour: 6, cap: 50, priceLRD: 0, desc: "5km easy run followed by stretching. Free for everyone." },
    { title: "Young Founders Business Circle", interest: "business", host: "u_grace", county: "Montserrado", location: "Royal Grand Hotel", inDays: 8, hour: 14, cap: 25, priceLRD: 500, desc: "Peer mentoring for entrepreneurs. Pitch, get feedback, grow together." },
    { title: "FIFA Tournament Night", interest: "gaming", host: "u_tommy", county: "Margibi", location: "Kakata Game Lounge", inDays: 5, hour: 18, cap: 32, priceLRD: 200, desc: "Bracket-style FIFA showdown. Winner takes the pot 🏆." },
    { title: "Photography Walk: Old Monrovia", interest: "photography", host: "u_kebeh", county: "Montserrado", location: "Waterside Market", inDays: 7, hour: 8, cap: 12, priceLRD: 0, desc: "Golden-hour street photography walk. Any camera or phone works." },
    { title: "Community Book Club", interest: "reading", host: "u_hawa", county: "Bong", location: "Gbarnga Public Library", inDays: 9, hour: 16, cap: 20, priceLRD: 0, desc: "This month's read: African short stories. Come discuss over tea." },
    { title: "Youth Farm Volunteer Day", interest: "farming", host: "u_jc", county: "Grand Gedeh", location: "Zwedru Demonstration Farm", inDays: 6, hour: 9, cap: 40, priceLRD: 0, desc: "Learn sustainable farming while giving back. Lunch provided." },
    { title: "Praise & Worship Night", interest: "faith", host: "u_fatu", county: "Bong", location: "Gbarnga Fellowship Hall", inDays: 3, hour: 18, cap: 100, priceLRD: 0, desc: "An evening of worship, prayer and community fellowship." },
    { title: "Fashion Pop-Up Market", interest: "fashion", host: "u_grace", county: "Montserrado", location: "Broad Street Plaza", inDays: 10, hour: 12, cap: 60, priceLRD: 0, desc: "Local designers showcase. Shop, connect, and support Liberian fashion." },
  ];

  window.FMB_DATA = { COUNTIES, INTERESTS, AV_COLORS, PEOPLE, ACTIVITY_SEED };
})();
