/* =========================
   DB + SESSION
   ========================= */
const DB_KEY = "ejournal_full_mvp_db_v1";
const SESSION_KEY = "ejournal_full_mvp_session_v1";

const $ = (s) => document.querySelector(s);

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
    };
    localStorage.setItem(DB_KEY, JSON.stringify(init));
    return init;
  }
  try { return JSON.parse(raw); } catch {
    localStorage.removeItem(DB_KEY);
    return dbLoad();
  }
}
function dbSave(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }

function sessionLoad() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
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
function hide(id){ $(id).classList.add("hidden"); }
function show(id){ $(id).classList.remove("hidden"); }

function fmtDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2,"0");
  const mm = String(dt.getMonth()+1).padStart(2,"0");
  const yy = dt.getFullYear();
  return `${dd}.${mm}.${yy}`;
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

