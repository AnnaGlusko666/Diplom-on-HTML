/* =========================
   DB + SESSION
   ========================= */
const DB_KEY = "ejournal_full_mvp_db_v1";
const SESSION_KEY = "ejournal_full_mvp_session_v1";

const $ = (s) => document.querySelector(s);

// Subjects list for dropdowns (MVP)
const SUBJECTS_UA = [
  "Українська мова",
  "Українська література",
  "Математика",
  "Алгебра",
  "Геометрія",
  "Англійська мова",
  "Історія України",
  "Всесвітня історія",
  "Географія",
  "Біологія",
  "Фізика",
  "Хімія",
  "Інформатика",
  "Зарубіжна література",
  "Мистецтво",
  "Фізкультура",
];
// expose as global (simple project without bundler)
window.SUBJECTS_UA = SUBJECTS_UA;

function uid() {
  return (crypto?.randomUUID?.() ?? (Math.random().toString(36).slice(2) + "-" + Date.now().toString(36)));
}

function dbLoad() {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const init = {
      users: [],
      classes: [],
      grades: [],
      schedules: {},
      shopItems: [],
      purchases: [],
      badges: [],
      attendance: [],
      messages: [],
      awards: [],
    };
    localStorage.setItem(DB_KEY, JSON.stringify(init));
    return init;
  }
  try { const db = JSON.parse(raw);
  // ensure new fields exist for older saved DB
  if(!Array.isArray(db.messages)) db.messages = [];
  if(!Array.isArray(db.awards)) db.awards = [];

  // MIGRATION: upsert core badges so UI/logic updates even if DB already existed
  if(!Array.isArray(db.badges)) db.badges = [];
  const wantedBadges = [
    { id:"att_mvp",        icon:"📅", name:"Відвідуваність", desc:"Отримай, якщо вчитель відмітить твою присутність хоча б 1 раз", rewardCoins:20 },
    { id:"legend_avg11",   icon:"🏅", name:"Легенда класу", desc:"Середній бал 11+ (мінімум 3 оцінки)", rewardCoins:200 },
    { id:"projects_3x12",  icon:"🛠️", name:"Майстер проєктів", desc:"3 проєкти на 12 (у назві роботи є «проєкт/проект»)", rewardCoins:250 },
  ];
  for(const b of wantedBadges){
    const i = db.badges.findIndex(x => x && x.id === b.id);
    if(i >= 0) db.badges[i] = { ...db.badges[i], ...b };
    else db.badges.push(b);
  }
  if(!Array.isArray(db.attendance)) db.attendance = [];
  return db; } catch {
    localStorage.removeItem(DB_KEY);
    return dbLoad();
  }
}
function dbSave(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function sessionLoad() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { const db = JSON.parse(raw);
  // ensure new fields exist for older saved DB
  if(!Array.isArray(db.messages)) db.messages = [];
  if(!Array.isArray(db.awards)) db.awards = [];

  // MIGRATION: upsert core badges so UI/logic updates even if DB already existed
  if(!Array.isArray(db.badges)) db.badges = [];
  const wantedBadges = [
    { id:"att_mvp",        icon:"📅", name:"Відвідуваність", desc:"Отримай, якщо вчитель відмітить твою присутність хоча б 1 раз", rewardCoins:20 },
    { id:"legend_avg11",   icon:"🏅", name:"Легенда класу", desc:"Середній бал 11+ (мінімум 3 оцінки)", rewardCoins:200 },
    { id:"projects_3x12",  icon:"🛠️", name:"Майстер проєктів", desc:"3 проєкти на 12 (у назві роботи є «проєкт/проект»)", rewardCoins:250 },
  ];
  for(const b of wantedBadges){
    const i = db.badges.findIndex(x => x && x.id === b.id);
    if(i >= 0) db.badges[i] = { ...db.badges[i], ...b };
    else db.badges.push(b);
  }
  if(!Array.isArray(db.attendance)) db.attendance = [];
  return db; } catch { return null; }
}
function sessionSave(s) {
  if (!s) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function showOnly(id) {
  ["#screenRole","#screenStudentLogin","#screenTeacherAuth","#screenTeacherLogin","#screenTeacherApp","#screenStudentApp"]
    .forEach(x => { const el = $(x); if (el) el.classList.add("hidden"); });
  const target = $(id);
  if (target) target.classList.remove("hidden");
// Заголовок зверху тільки на старті (екран ролі)
  const ph = $("#publicHeader");
  if (ph) ph.classList.toggle("hidden", id !== "#screenRole");
}
function hide(id){ const el = $(id); if(el) el.classList.add("hidden"); }
function show(id){ const el = $(id); if(el) el.classList.remove("hidden"); }

function fmtDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yy = dt.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

// Basic XSS-safe escaping for text shown in innerHTML templates
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================
   HELPERS
   ========================= */
function getTeacher(id) {
  const db = dbLoad();
  return db.users.find(u => u.id===id && u.role==="teacher");
}

function gradeColorClass(value) {
  // 1-5 red, 6-8 blue, 9-12 green
  if (value <= 5) return "red";
  if (value <= 8) return "blue";
  return "green";
}




/* =========================
   UI HELPERS (MODAL)
   ========================= */
function ensureModal(){
  if (document.getElementById("appModal")) return;
  const wrap = document.createElement("div");
  wrap.id = "appModal";
  wrap.className = "modal hidden";
  wrap.innerHTML = `
    <div class="modal-backdrop" data-close="1"></div>
    <div class="modal-card" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div class="modal-title" id="appModalTitle">—</div>
        <button class="btn btn-ghost" id="appModalClose" aria-label="Close">✕</button>
      </div>
      <div class="modal-body" id="appModalBody"></div>
      <div class="modal-actions" id="appModalActions"></div>
    </div>
  `;
  document.body.appendChild(wrap);
  wrap.querySelector("[data-close]").onclick = modalClose;
  wrap.querySelector("#appModalClose").onclick = modalClose;
}
function modalShow({ title, bodyHTML, actions }){
  ensureModal();
  $("#appModalTitle").textContent = title || "";
  $("#appModalBody").innerHTML = bodyHTML || "";
  const act = $("#appModalActions");
  act.innerHTML = "";
  (actions||[]).forEach(a=>{
    const b=document.createElement("button");
    b.className = a.className || "btn";
    b.textContent = a.text || "OK";
    b.onclick = () => { if(a.onClick) a.onClick(); };
    act.appendChild(b);
  });
  $("#appModal").classList.remove("hidden");
}
function modalClose(){
  const m = document.getElementById("appModal");
  if(m) m.classList.add("hidden");
}

/* =========================
   MESSAGES / NOTIFICATIONS
   ========================= */
function msgUnreadCount(userId){
  const db = dbLoad();
  return db.messages.filter(m => m.toUserId===userId && !m.read).length;
}
function msgMarkAllRead(userId){
  const db = dbLoad();
  db.messages.forEach(m => { if(m.toUserId===userId) m.read=true; });
  dbSave(db);
}
// msgSend supports two signatures:
// 1) msgSend({fromUserId, toUserId, kind, text, meta})
// 2) msgSend(toUserId, htmlText)  // legacy helper
function msgSend(a, b){
  // legacy signature
  if(typeof a === "string"){
    const toUserId = a;
    const text = b;
    return msgSend({ fromUserId: null, toUserId, kind: "info", text, meta: {} });
  }

  const {fromUserId, toUserId, kind, text, meta} = a || {};
  const db = dbLoad();
  db.messages.push({
    id: uid(),
    fromUserId, toUserId,
    kind,
    text: String(text||"").trim(),
    meta: meta || {},
    createdAt: Date.now(),
    read: false
  });
  dbSave(db);
}

/* =========================
   VISUAL RESET (avoid leaking student effects)
   ========================= */
function resetGlobalVisuals(){
  document.body.classList.remove("theme-winter");
  const snow = document.getElementById("snowLayer");
  if(snow){ snow.classList.remove("active"); snow.innerHTML=""; }
}

/* =========================
   AUTO BADGES (MVP)
   ========================= */
function autoAwardBadgesForStudent(studentId){
  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if(!st) return;

  st.badgesEarned = st.badgesEarned || [];
  const earned = new Set(st.badgesEarned);

  const grades = db.grades.filter(g => g.studentId===studentId);
  const attendance = (db.attendance||[]).filter(a => a.studentId===studentId);

  function grant(badge){
    if(!badge || earned.has(badge.id)) return false;
    earned.add(badge.id);
    st.badgesEarned.push(badge.id);
    st.coins = (st.coins||0) + (badge.rewardCoins||0);
    msgSend(studentId, `🏆 Відзнака отримана: <b>${escapeHtml(badge.name)}</b> (+${badge.rewardCoins} 🪙)`);
    return true;
  }

  const byId = Object.fromEntries((db.badges||[]).map(b => [b.id,b]));

  // 1) Attendance: any "present" mark
  if(attendance.some(a => a.present === true)){
    grant(byId["att_mvp"]);
  }

  // 2) Legend of class: average grade >= 11 (need at least 3 grades to avoid случайно)
  if(grades.length >= 3){
    const avg = grades.reduce((s,g)=>s+Number(g.value||0),0)/grades.length;
    if(avg >= 11) grant(byId["legend_avg11"]);
  }

  // 3) Projects master: 3 project works with 12
  const proj12 = grades.filter(g => String(g.work||"").toLowerCase().includes("проєкт") || String(g.work||"").toLowerCase().includes("проект"))
                       .filter(g => Number(g.value) === 12).length;
  if(proj12 >= 3){
    grant(byId["projects_3x12"]);
  }

  dbSave(db);
}

/* =========================
   AUTO RARE REWARDS
   ========================= */
function autoAwardRareForStudent(studentId){
  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if(!st) return;

  st.rareEarned = st.rareEarned || [];
  const earned = new Set(st.rareEarned);

  const byId = Object.fromEntries((db.rareRewards||[]).map(r => [r.id, r]));

  function grant(rr){
    if(!rr || earned.has(rr.id)) return false;
    earned.add(rr.id);
    st.rareEarned.push(rr.id);
    st.coins = (st.coins||0) + (rr.rewardCoins||0);
    msgSend(studentId, `✨ Рідкісна нагорода: <b>${escapeHtml(rr.title)}</b> (+${rr.rewardCoins} 🪙)`);
    return true;
  }

  // Rare #1: 30 days without absences (based on attendance marks)
  const rec = (db.attendance||[])
    .filter(a => a.studentId===studentId)
    .sort((x,y)=>String(x.date).localeCompare(String(y.date)));

  // Build per-date status: absent if any record for that date has present=false
  const perDate = new Map();
  for(const a of rec){
    const d = String(a.date||"");
    if(!d) continue;
    const cur = perDate.get(d);
    const isAbsent = (a.present === false);
    if(cur === undefined) perDate.set(d, { absent: isAbsent });
    else perDate.set(d, { absent: cur.absent || isAbsent });
  }
  const dates = Array.from(perDate.keys()).sort();
  if(dates.length >= 30){
    const last30 = dates.slice(-30);
    const noAbs = last30.every(d => perDate.get(d) && !perDate.get(d).absent);
    if(noAbs) grant(byId["rare_noskips_30"]);
  }

  dbSave(db);
}
