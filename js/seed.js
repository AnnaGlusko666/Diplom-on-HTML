/* =========================
   SEED
   ========================= */

function upsertById(list, mustItems) {
  const arr = Array.isArray(list) ? list : [];
  const byId = Object.fromEntries(arr.filter(Boolean).map(x => [x.id, x]));

  for (const it of mustItems) {
    if (!it || !it.id) continue;
    byId[it.id] = { ...(byId[it.id] || {}), ...it };
  }

  // Повертаємо масив у стабільному порядку: спочатку mustItems, потім "інші" (якщо були)
  const mustIds = new Set(mustItems.map(x => x.id));
  const out = [
    ...mustItems.map(x => byId[x.id]).filter(Boolean),
    ...Object.values(byId).filter(x => x && !mustIds.has(x.id)),
  ];

  return out;
}

function ensureSeed() {

  const db = dbLoad();

  // Ensure arrays exist
  if (!Array.isArray(db.attendance)) db.attendance = [];
  if (!Array.isArray(db.shopItems)) db.shopItems = [];
  if (!Array.isArray(db.badges)) db.badges = [];
  if (!Array.isArray(db.rareRewards)) db.rareRewards = [];

  // -------------------------
  // SHOP ITEMS (upsert)
  // -------------------------
  const shopMust = [
    { id:"it_frame",   tab:"profile",    title:"Стильна рамка профілю", desc:"Додає золоту рамку навколо аватара", price:50,  icon:"🖼️", type:"profile" },
    { id:"it_avatar",  tab:"profile",    title:"Анімований аватар",     desc:"Ефект анімації аватара",            price:100, icon:"🧑", type:"profile" },
    { id:"it_theme",   tab:"special",    title:"Тема інтерфейсу «Зима»", desc:"Декор та стиль інтерфейсу",         price:150, icon:"❄️", type:"profile" },
    { id:"it_skip",    tab:"privileges", title:"Пропуск уроку",         desc:"Можливість пропустити 1 урок",       price:300, icon:"🚪", type:"privilege" },
    { id:"it_time",    tab:"privileges", title:"Додатковий час",        desc:"+1 день на здачу завдання",          price:200, icon:"⏱️", type:"privilege" },
    { id:"it_shield",  tab:"special",    title:"Захист від двійки",     desc:"1 раз замінити 2 на 4",              price:250, icon:"🛡️", type:"privilege" },
  ];
  db.shopItems = upsertById(db.shopItems, shopMust);

  // -------------------------
  // BADGES (upsert)  ✅ головне виправлення
  // -------------------------
  const badgesMust = [
    { id:"b_first12", icon:"🌟", name:"Перша 12",        desc:"Отримайте першу оцінку 12",          rewardCoins:30 },
    { id:"b_active",  icon:"🔥", name:"Активність",     desc:"3 оцінки 10+ за тиждень",            rewardCoins:20 },
    { id:"b_top",     icon:"👑", name:"Топ успішності", desc:"Середній бал >= 10",                 rewardCoins:50 },
    { id:"b_project", icon:"🧩", name:"Проєктна робота",desc:"Отримайте оцінку 12 за проєкт",      rewardCoins:40 },
    { id:"b_help",    icon:"🤝", name:"Допомога іншим", desc:"Отримайте 5 оцінок 11+ загалом",     rewardCoins:30 },

    // цей бейдж також є в core.js (міграція + автонагородження), тому залишаємо той самий id
    { id:"att_mvp",   icon:"📅", name:"Відвідуваність", desc:"Отримай, якщо вчитель відмітить твою присутність хоча б 1 раз", rewardCoins:20 },
];
  db.badges = upsertById(db.badges, badgesMust);

  // -------------------------
  // RARE REWARDS (upsert)
  // -------------------------
  const rareMust = [
    { id:"rare_noskips_30", title:"Без пропусків",  desc:"30 днів без пропусків",                  rewardCoins:150, icon:"✨" },
    { id:"legend_avg11",    title:"Легенда класу",  desc:"Середній бал 11+ (мінімум 3 оцінки)",    rewardCoins:200, icon:"🏆" },
    { id:"projects_3x12",   title:"Майстер проєктів", desc:"3 проєкти на 12 (робота містить слово «проєкт»)", rewardCoins:250, icon:"🛠️" },
  ];
  db.rareRewards = upsertById(db.rareRewards, rareMust);

  dbSave(db);
}

ensureSeed();

/* =========================
   SUBJECTS
   ========================= */
const SUBJECTS = [
  "Математика",
  "Українська мова",
  "Українська література",
  "Інформатика",
  "Фізика",
  "Хімія",
  "Біологія",
  "Географія",
  "Історія",
  "Англійська мова",
  "Німецька мова",
  "Фізкультура",
  "Зарубіжна література"
];

function fillScheduleSubjectsSelect() {
  const sel = $("#tSchSubject");
  if (!sel) return;
  sel.innerHTML = SUBJECTS.map(s => `<option value="${s}">${s}</option>`).join("");
}