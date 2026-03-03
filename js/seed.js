/* =========================
   SEED
   ========================= */
function ensureSeed() {
  const db = dbLoad();
  if (!db.attendance) db.attendance = [];

  // класи створюються при першій реєстрації вчителя

  if (!db.badges || db.badges.length === 0) {
    db.badges = [
      { id:"att_mvp",        icon:"📅", name:"Відвідуваність", desc:"Відмічено присутність хоча б на одному уроці", rewardCoins:20 },
      { id:"legend_avg11",   icon:"🏅", name:"Легенда класу", desc:"Середній бал 11+ (мінімум 3 оцінки)", rewardCoins:200 },
      { id:"projects_3x12",  icon:"🛠️", name:"Майстер проєктів", desc:"3 проєкти на 12 (робота містить слово «проєкт»)", rewardCoins:250 },
    ];
  }

  // Rare rewards (upsert by id)
  db.rareRewards = Array.isArray(db.rareRewards) ? db.rareRewards : [];
  const rrById = Object.fromEntries(db.rareRewards.map(r => [r.id, r]));
  const rrMust = [
    { id:"rare_noskips_30", title:"Без пропусків", desc:"30 днів без пропусків", rewardCoins:150, icon:"✨" },
  ];
  rrMust.forEach(r => { rrById[r.id] = { ...(rrById[r.id]||{}), ...r }; });
  db.rareRewards = Object.values(rrById);

  if (!db.shopItems || db.shopItems.length === 0) {
    db.shopItems = [
      { id:"it_frame",   tab:"profile",    title:"Стильна рамка профілю", desc:"Додає золоту рамку навколо аватара", price:50,  icon:"🖼️", type:"profile" },
      { id:"it_avatar",  tab:"profile",    title:"Анімований аватар",     desc:"Ефект анімації аватара",            price:100, icon:"🧑", type:"profile" },
      { id:"it_theme",   tab:"special",    title:"Тема інтерфейсу «Зима»", desc:"Декор та стиль інтерфейсу",         price:150, icon:"❄️", type:"profile" },
      { id:"it_skip",    tab:"privileges", title:"Пропуск уроку",         desc:"Можливість пропустити 1 урок",       price:300, icon:"🚪", type:"privilege" },
      { id:"it_time",    tab:"privileges", title:"Додатковий час",        desc:"+1 день на здачу завдання",          price:200, icon:"⏱️", type:"privilege" },
      { id:"it_shield",  tab:"special",    title:"Захист від двійки",     desc:"1 раз замінити 2 на 4",              price:250, icon:"🛡️", type:"privilege" },
    ];
  }

  if (!db.badges || db.badges.length === 0) {
    db.badges = [
      { id:"b_first12", icon:"🌟", name:"Перша 12", desc:"Отримайте першу оцінку 12", rewardCoins:30 },
      { id:"b_active",  icon:"🔥", name:"Активність", desc:"3 оцінки 10+ за тиждень", rewardCoins:20 },
      { id:"b_top",     icon:"👑", name:"Топ успішності", desc:"Середній бал >= 10", rewardCoins:50 },
      { id:"b_project", icon:"🧩", name:"Проєктна робота", desc:"Отримайте оцінку 12 за проєкт", rewardCoins:40 },
      { id:"b_help",    icon:"🤝", name:"Допомога іншим", desc:"Отримайте 5 оцінок 11+ загалом", rewardCoins:30 },
      { id:"b_att",     icon:"📅", name:"Відвідуваність", desc:"У MVP видається вручну (пізніше)", rewardCoins:20 },
    ];
  }

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

