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
   SEED
   ========================= */
function ensureSeed() {
  const db = dbLoad();

  // класи створюються при першій реєстрації вчителя

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

/* =========================
   CREDS helpers
   ========================= */
function genPassword(len=8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}
function genStudentLogin(db) {
  const existing = db.users.filter(u => u.role==="student" && u.login?.startsWith("student_")).length;
  return `student_${existing+1}`;
}

/* =========================
   AUTH
   ========================= */
function teacherRegister({name, subject, login, password}) {
  const db = dbLoad();

  name = (name||"").trim();
  login = (login||"").trim();
  password = (password||"").trim();
  subject = (subject||"").trim();

  if (!name) return { ok:false, msg:"Вкажіть ім'я та прізвище" };
  if (!login) return { ok:false, msg:"Вкажіть логін" };
  if (!password || password.length < 4) return { ok:false, msg:"Пароль має бути мінімум 4 символи" };

  if (db.users.some(u => u.login === login)) return { ok:false, msg:"Такий логін вже існує" };

  const teacher = {
    id: uid(),
    role:"teacher",
    name,
    subject,
    login,
    password,
    classIds: [],
    coinsGivenTotal: 0
  };

  // Створюємо базові класи тільки 1 раз (щоб усі вчителі працювали з однією базою)
  if (db.classes.length === 0) {
    const clsNames = ["7-А клас","7-Б клас","8-А клас","9-А клас","10-А клас","11-А клас"];
    db.classes = clsNames.map(n => ({ id: uid(), name:n, homeroomTeacherId: null }));
  }

  teacher.classIds = db.classes.map(c => c.id);
  db.users.push(teacher);
  dbSave(db);
  return { ok:true, user: teacher };
}

function loginUser(role, login, password) {
  const db = dbLoad();
  login = (login||"").trim();
  password = (password||"").trim();

  const u = db.users.find(x => x.role===role && x.login===login && x.password===password);
  if (!u) return { ok:false, msg:"Невірний логін або пароль" };
  return { ok:true, user:u };
}

function logout() {
  sessionSave(null);
  showOnly("#screenRole");
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
   TEACHER
   ========================= */
function teacherFillSelects(teacher) {
  const db = dbLoad();
  const classes = db.classes.filter(c => teacher.classIds.includes(c.id));

  $("#panelClassSelect").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#studentClassSelect").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  $("#tGradesClass").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#tSchClass").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  $("#panelSubjectSelect").innerHTML = `<option value="${teacher.subject}">${teacher.subject}</option>`;

  $("#studentClassSelect").value = $("#panelClassSelect").value;
  teacherFillStudentsDropdown(teacher, $("#tGradesClass").value);
}

function teacherFillStudentsDropdown(teacher, classId) {
  const db = dbLoad();
  const students = db.users
    .filter(u => u.role==="student" && u.classId===classId)
    .sort((a,b)=>a.name.localeCompare(b.name));
  $("#tGradesStudent").innerHTML = students.length
    ? students.map(s => `<option value="${s.id}">${s.name}</option>`).join("")
    : `<option value="">(немає учнів)</option>`;
}

function teacherGenerateCredsUI() {
  const db = dbLoad();

  // якщо логін пустий — підставимо автологін як допомога
  if (!($("#studentLogin").value || "").trim()) {
    $("#studentLogin").value = genStudentLogin(db);
  }
  // пароль генеримо завжди
  $("#studentPassword").value = genPassword(8);
  $("#addStudentMsg").textContent = "Згенеровано логін/пароль ✅";
}

function teacherSaveStudentUI(teacher) {
  const db = dbLoad();

  const name = ($("#studentFullName").value||"").trim();
  const classId = $("#studentClassSelect").value;
  const login = ($("#studentLogin").value||"").trim();
  const password = ($("#studentPassword").value||"").trim();

  if (!name) { $("#addStudentMsg").textContent = "Вкажіть ім'я учня"; return; }
  if (!classId) { $("#addStudentMsg").textContent = "Оберіть клас"; return; }
  if (!login) { $("#addStudentMsg").textContent = "Вкажіть логін"; return; }
  if (!password) { $("#addStudentMsg").textContent = "Вкажіть пароль"; return; }

  // логін унікальний у всій системі
  if (db.users.some(u => u.login === login)) {
    $("#addStudentMsg").textContent = "Такий логін вже існує. Вкажіть інший або натисніть «Згенерувати»";
    return;
  }

  const st = {
    id: uid(),
    role:"student",
    name,
    classId,
    login,
    password,

    createdByTeacherId: teacher?.id ?? null, // ✅ важливо: мій/інший
    coins: 0,
    points: 0,
    badgesEarned: [],
    inventory: [],
    avatarDataUrl: null
  };

  db.users.push(st);
  dbSave(db);

  $("#addStudentMsg").textContent = `Учня додано ✅ Логін: ${login} | Пароль: ${password}`;

  $("#studentFullName").value = "";
  $("#studentLogin").value = "";
  $("#studentPassword").value = "";

  teacherRenderStudents(teacher);
  teacherFillStudentsDropdown(teacher, $("#tGradesClass").value);
}

function teacherRenderStudents(teacher) {
  const db = dbLoad();
  const classId = $("#panelClassSelect").value;
  const cls = db.classes.find(c => c.id === classId);

  // ✅ показуємо всіх учнів класу (не важливо ким створені)
  const students = db.users
    .filter(u => u.role === "student" && u.classId === classId)
    .sort((a,b)=>a.name.localeCompare(b.name));

  $("#panelStudentsCount").textContent = String(students.length);

  const emptyHint = $("#studentsEmptyHint");
  const wrap = $("#studentsListWrap");

  if (!students.length) {
    emptyHint.textContent = "У класі поки немає учнів.";
    emptyHint.classList.remove("hidden");
    wrap.innerHTML = "";
    return;
  }

  emptyHint.classList.add("hidden");

  const rows = students.map(s => {
    const mine = s.createdByTeacherId && teacher?.id ? (s.createdByTeacherId === teacher.id) : false;
    const who = mine ? "Мій" : "Інший";
    return `
      <tr>
        <td><b>${s.name}</b></td>
        <td>${cls ? cls.name : "—"}</td>
        <td>${s.login}</td>
        <td>${s.password}</td>
        <td>${who}</td>
      </tr>
    `;
  }).join("");

  wrap.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Учень</th><th>Клас</th><th>Логін</th><th>Пароль</th><th>Хто створив</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function teacherExportStudentsExcel() {
  const db = dbLoad();
  const classId = $("#panelClassSelect").value;
  const cls = db.classes.find(c => c.id === classId);

  const rows = db.users
    .filter(u => u.role === "student" && u.classId === classId)
    .sort((a,b)=>a.name.localeCompare(b.name))
    .map((u, i) => ({
      "№": i + 1,
      "Учень": u.name,
      "Клас": cls?.name ?? "",
      "Логін": u.login,
      "Пароль": u.password,
    }));

  if (!rows.length) {
    alert("Немає учнів у вибраному класі");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Учні");
  const safeName = (cls?.name ?? "class").replaceAll(" ", "_");
  XLSX.writeFile(wb, `students_${safeName}_credentials.xlsx`);
}

/* ===== Teacher grades ===== */
function coinsByGrade(value) {
  if (value >= 12) return 10;
  if (value === 11) return 8;
  if (value === 10) return 6;
  if (value === 9) return 3;
  if (value <= 6) return -2;
  return 0;
}

function awardBadgesForStudent(db, studentId) {
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if (!st) return;
  st.badgesEarned = st.badgesEarned || [];

  const stGrades = db.grades.filter(g => g.studentId === studentId);
  const earnedSet = new Set(st.badgesEarned);

  function give(badgeId) {
    if (earnedSet.has(badgeId)) return;
    const badge = db.badges.find(b => b.id === badgeId);
    if (!badge) return;
    earnedSet.add(badgeId);
    st.badgesEarned.push(badgeId);
    st.coins = Number(st.coins||0) + (badge.rewardCoins||0);
  }

  if (stGrades.some(g => g.value === 12)) give("b_first12");
  if (stGrades.some(g => g.value === 12 && String(g.work).toLowerCase().includes("про"))) give("b_project");
  if (stGrades.filter(g => g.value >= 11).length >= 5) give("b_help");

  const vals = stGrades.map(g => Number(g.value)).filter(n => Number.isFinite(n));
  if (vals.length) {
    const avg = vals.reduce((a,v)=>a+v,0)/vals.length;
    if (avg >= 10) give("b_top");
  }

  const weekAgo = Date.now() - 7*24*60*60*1000;
  const cnt = stGrades.filter(g => g.createdAt >= weekAgo && g.value >= 10).length;
  if (cnt >= 3) give("b_active");
}

function teacherAddGrade(teacherId) {
  const db = dbLoad();
  const teacher = getTeacher(teacherId);
  if (!teacher) return;

  const classId = $("#tGradesClass").value;
  const studentId = $("#tGradesStudent").value;
  const work = ($("#tGradesWork").value || "").trim();
  const value = Number(($("#tGradesValue").value || "").trim());

  if (!studentId) { $("#tGradesMsg").textContent = "Немає учнів у класі"; return; }
  if (!work) { $("#tGradesMsg").textContent = "Вкажіть тип роботи"; return; }
  if (!Number.isFinite(value) || value < 1 || value > 12) { $("#tGradesMsg").textContent = "Оцінка має бути 1-12"; return; }

  const student = db.users.find(u => u.id === studentId && u.role==="student");
  if (!student) { $("#tGradesMsg").textContent = "Учня не знайдено"; return; }

  db.grades.push({
    id: uid(),
    studentId,
    classId,
    subject: teacher.subject,
    work,
    value,
    teacherName: teacher.name,
    createdAt: Date.now()
  });

  const deltaCoins = coinsByGrade(value);
  student.coins = Math.max(0, Number(student.coins||0) + deltaCoins);
  student.points = Number(student.points||0) + value * 5;

  teacher.coinsGivenTotal = Number(teacher.coinsGivenTotal||0) + Math.max(0, deltaCoins);

  awardBadgesForStudent(db, studentId);
  dbSave(db);

  $("#tGradesMsg").textContent = `Додано ✅ ${student.name}: ${value} | монети: ${deltaCoins >= 0 ? "+" : ""}${deltaCoins}`;
  $("#tGradesWork").value = "";
  $("#tGradesValue").value = "";

  teacherRenderTeacherGradesList(teacherId);
}

function teacherRenderTeacherGradesList(teacherId) {
  const db = dbLoad();
  const teacher = getTeacher(teacherId);
  const host = $("#tGradesList");

  const last = db.grades
    .filter(g => g.teacherName === teacher.name)
    .slice(-10)
    .reverse();

  if (!last.length) { host.innerHTML = `<p class="muted">Поки немає оцінок.</p>`; return; }

  host.innerHTML = `
    <table class="table">
      <thead><tr><th>Учень</th><th>Предмет</th><th>Оцінка</th><th>Робота</th><th>Дата</th></tr></thead>
      <tbody>
        ${last.map(g => {
          const st = db.users.find(u => u.id === g.studentId);
          return `<tr>
            <td>${st?.name ?? "—"}</td>
            <td>${g.subject}</td>
            <td><b>${g.value}</b></td>
            <td>${g.work}</td>
            <td>${fmtDate(g.createdAt)}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

/* ===== Teacher schedule ===== */
function teacherAddLesson(teacherId) {
  const db = dbLoad();
  const teacher = getTeacher(teacherId);
  if (!teacher) return;

  const classId = $("#tSchClass").value;
  const day = $("#tSchDay").value;
  const time = ($("#tSchTime").value||"").trim();
  const subj = ($("#tSchSubject").value||"").trim();
  const room = ($("#tSchRoom").value||"").trim();

  if (!time || !subj || !room) { $("#tSchMsg").textContent = "Заповніть час, предмет і кабінет"; return; }

  if (!db.schedules[classId]) db.schedules[classId] = { "1":[], "2":[], "3":[], "4":[], "5":[], "6":[], "7":[] };
  db.schedules[classId][day] = db.schedules[classId][day] || [];
  db.schedules[classId][day].push({ time, subject: subj, room });

  dbSave(db);
  $("#tSchMsg").textContent = "Урок додано ✅";
  $("#tSchTime").value = "";
  $("#tSchRoom").value = "";

  teacherRenderScheduleList(teacherId);
}

function teacherRenderScheduleList(teacherId) {
  const db = dbLoad();
  const classId = $("#tSchClass").value;
  const sch = db.schedules[classId];

  const dayNames = { "1":"Пн","2":"Вт","3":"Ср","4":"Чт","5":"Пт","6":"Сб","7":"Нд" };
  const host = $("#tSchList");

  if (!sch) { host.innerHTML = `<p class="muted">Розкладу ще немає.</p>`; return; }

  let html = "";
  for (const day of Object.keys(dayNames)) {
    const items = (sch[day] || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
    html += `<div class="card" style="margin-top:12px;">
      <h4 style="margin:0 0 8px;">${dayNames[day]}</h4>
    `;
    if (!items.length) html += `<div class="muted">Немає уроків</div>`;
    else html += `<div class="muted small">${items.map(x => `${x.time} — ${x.subject} (${x.room})`).join("<br/>")}</div>`;
    html += `</div>`;
  }
  host.innerHTML = html;
}

/* ===== Teacher profile ===== */
function teacherRenderProfile(teacherId) {
  const db = dbLoad();
  const teacher = getTeacher(teacherId);
  const classes = db.classes.filter(c => teacher.classIds.includes(c.id));

  $("#tpName").textContent = teacher.name;
  $("#tpSubject").textContent = teacher.subject;
  $("#tpClasses").textContent = classes.map(c => c.name.replace(" клас","")).join(", ");

  const teacherGrades = db.grades.filter(g => g.teacherName === teacher.name);
  $("#tpGradesCount").textContent = String(teacherGrades.length);
  $("#tpCoinsGiven").textContent = String(Number(teacher.coinsGivenTotal||0));
}

/* =========================
   STUDENT
   ========================= */
function studentGetData(studentId) {
  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  const cls = db.classes.find(c => c.id === st?.classId);
  const grades = db.grades.filter(g => g.studentId === studentId).sort((a,b)=>b.createdAt-a.createdAt);
  const purchases = db.purchases.filter(p => p.studentId === studentId);
  const inventoryIds = new Set((st?.inventory||[]));
  purchases.forEach(p => inventoryIds.add(p.itemId));
  return { db, st, cls, grades, inventoryIds };
}

function studentUpdateTopbar(st, cls) {
  $("#stTopName").textContent = st.name;
  $("#stTopClass").textContent = cls ? cls.name : "—";
  $("#stTopCoins").textContent = String(st.coins||0);
  $("#stTopPoints").textContent = String(st.points||0);
}

function calcAvg(grades) {
  const vals = grades.map(g => Number(g.value)).filter(n => Number.isFinite(n));
  if (!vals.length) return null;
  const avg = vals.reduce((a,v)=>a+v,0)/vals.length;
  return Math.round(avg*10)/10;
}

function studentRenderHome(studentId) {
  const { st, grades } = studentGetData(studentId);
  $("#sToday").textContent = `Сьогодні: ${fmtDate(Date.now())}`;

  const avg = calcAvg(grades);
  $("#kpiAvg").textContent = (avg==null ? "—" : String(avg));
  $("#kpiPoints").textContent = String(st.points||0);
  $("#kpiCoins").textContent = String(st.coins||0);

  const db = dbLoad();
  const totalBadges = db.badges.length;
  const earned = (st.badgesEarned||[]).length;
  $("#kpiBadges").textContent = `${earned}/${totalBadges}`;

  const host = $("#sRecentGrades");
  const recent = grades.slice(0,5);

  if (!recent.length) {
    host.innerHTML = `<div class="grade-row"><div class="muted">Поки немає оцінок.</div></div>`;
    return;
  }

  host.innerHTML = recent.map(g => {
    const ico = (g.subject || "").toLowerCase().includes("мат") ? "purple"
      : (g.subject || "").toLowerCase().includes("іст") ? "red"
      : "blue";

    const c = gradeColorClass(g.value);

    return `
      <div class="grade-row">
        <div class="grade-left">
          <div class="subj-ico ${ico}">${(g.subject||"?").slice(0,1)}</div>
          <div>
            <div class="grade-title">${g.subject}</div>
            <div class="grade-sub">${g.work} • ${g.teacherName}</div>
          </div>
        </div>
        <div class="grade-right">
          <div class="grade-badge ${c}">${g.value}</div>
          <div class="grade-date">${fmtDate(g.createdAt)}</div>
        </div>
      </div>
    `;
  }).join("");
}

function studentInitGradesFilter(studentId) {
  const { grades } = studentGetData(studentId);
  const subs = Array.from(new Set(grades.map(g => g.subject))).filter(Boolean).sort();
  const sel = $("#sGradesFilter");
  sel.innerHTML = `<option value="all">Всі предмети</option>` + subs.map(s => `<option value="${s}">${s}</option>`).join("");
  sel.onchange = () => studentRenderGrades(studentId);
}

function studentRenderGrades(studentId) {
  const { grades } = studentGetData(studentId);
  const filter = $("#sGradesFilter").value;
  const host = $("#sGradesBlocks");

  const bySub = {};
  grades.forEach(g => {
    if (filter !== "all" && g.subject !== filter) return;
    bySub[g.subject] = bySub[g.subject] || [];
    bySub[g.subject].push(g);
  });

  const subjects = Object.keys(bySub).sort();
  if (!subjects.length) { host.innerHTML = `<p class="muted">Немає оцінок.</p>`; return; }

  host.innerHTML = subjects.map(sub => {
    const items = bySub[sub].slice().reverse();
    return `
      <div class="subject-block">
        <div class="subject-head">
          <div>${sub}</div>
          <div class="muted small">${items.length} оцінок</div>
        </div>
        <div class="subject-body">
          ${items.map(g => {
            const c = gradeColorClass(g.value);
            return `
              <div class="subject-row">
                <div class="subject-mark">
                  <div class="mark-box ${c}">${g.value}</div>
                  <div>
                    <div class="subject-note"><b>${g.work}</b></div>
                    <div class="muted small">${g.teacherName}</div>
                  </div>
                </div>
                <div class="subject-meta">${fmtDate(g.createdAt)}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");
}

function studentRenderSchedule(studentId, day) {
  const { db, st } = studentGetData(studentId);
  const sch = db.schedules[st.classId];

  const host = $("#sScheduleList");
  const hint = $("#sSchHint");

  if (!sch) {
    hint.classList.remove("hidden");
    host.innerHTML = "";
    return;
  }

  const items = (sch[String(day)] || []).slice().sort((a,b)=>a.time.localeCompare(b.time));
  if (!items.length) {
    hint.textContent = "На цей день уроків немає.";
    hint.classList.remove("hidden");
    host.innerHTML = "";
    return;
  }

  hint.classList.add("hidden");
  host.innerHTML = items.map(x => `
    <div class="lesson">
      <div class="lesson-time">${x.time}</div>
      <div class="lesson-subj">${x.subject}</div>
      <div class="lesson-room">${x.room}</div>
    </div>
  `).join("");
}

function studentRenderMotivation(studentId) {
  const { db, st } = studentGetData(studentId);
  const earned = new Set(st.badgesEarned||[]);

  $("#sBadgesCounter").textContent = String(earned.size);
  $("#sBadgesTotal").textContent = String(db.badges.length);

  const grid = $("#badgesGrid");
  grid.innerHTML = db.badges.map(b => {
    const ok = earned.has(b.id);
    return `
      <div class="badge-card">
        <div class="badge-ico">${b.icon}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
        <div class="badge-reward">+${b.rewardCoins} 🪙</div>
        <div class="badge-status ${ok?"ok":"no"}">${ok?"Отримано ✅":"Не отримано"}</div>
      </div>
    `;
  }).join("");

  const rare = [
    { title:"Легенда класу", desc:"Середній бал 11+ (у майбутньому)", status:"MVP: недоступно", reward:"+200 🪙" },
    { title:"Без пропусків", desc:"30 днів без пропусків (у майбутньому)", status:"MVP: недоступно", reward:"+150 🪙" },
    { title:"Майстер проєктів", desc:"3 проєкти на 12 (у майбутньому)", status:"MVP: недоступно", reward:"+250 🪙" },
  ];
  $("#rareGrid").innerHTML = rare.map(r => `
    <div class="rare-card">
      <div class="rare-title">${r.title}</div>
      <div class="rare-desc">${r.desc}</div>
      <div class="rare-status">${r.status}</div>
      <div class="rare-reward">${r.reward}</div>
    </div>
  `).join("");
}

/* ===== Exchange points to coins: 10 points -> 1 coin ===== */
function studentExchangePoints(studentId) {
  const pts = Number(($("#exchangePoints").value || "").trim());

  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if (!st) return;

  const msg = $("#exchangeMsg");
  msg.textContent = "";

  if (!Number.isFinite(pts) || pts <= 0) {
    msg.textContent = "Введіть кількість балів (число більше 0)";
    return;
  }
  if (pts % 10 !== 0) {
    msg.textContent = "Має бути кратно 10 (10, 20, 30...)";
    return;
  }
  if ((st.points||0) < pts) {
    msg.textContent = "Недостатньо балів для обміну";
    return;
  }

  const coinsAdd = pts / 10;
  st.points -= pts;
  st.coins = Number(st.coins||0) + coinsAdd;

  dbSave(db);

  msg.textContent = `Обмін виконано ✅ +${coinsAdd} монет`;
  $("#exchangePoints").value = "";

  const cls = db.classes.find(c => c.id===st.classId);
  studentUpdateTopbar(st, cls);
  studentRenderHome(studentId);
  studentRenderProfile(studentId);
  studentRenderShop(studentId, "exchange");
}


/* =====================
   STUDENT PROFILE COSMETICS + PRIVILEGES
   ===================== */
function studentEnsureSettings(st){
  st.profile = st.profile || {};
  if (st.profile.frameStyle == null) st.profile.frameStyle = "gold";
  if (st.profile.frameEnabled == null) st.profile.frameEnabled = false;

  if (st.profile.winterThemeEnabled == null) st.profile.winterThemeEnabled = false;
  if (st.profile.snowEnabled == null) st.profile.snowEnabled = true;

  if (st.profile.avatarAnimEnabled == null) st.profile.avatarAnimEnabled = false;
  if (st.profile.avatarAnimEffect == null) st.profile.avatarAnimEffect = "pulse";

  st.privileges = st.privileges || {};
  if (!st.privileges.skip) st.privileges.skip = { lessonNo:null, used:false };
  if (!st.privileges.extraTime) st.privileges.extraTime = { lessonNo:null, used:false };
  if (!st.privileges.shield) st.privileges.shield = { lessonNo:null, used:false };
}

function ensureSnowLayer(){
  if (document.getElementById("snowLayer")) return;
  const layer = document.createElement("div");
  layer.id = "snowLayer";
  document.body.appendChild(layer);
}

function snowSetActive(on){
  ensureSnowLayer();
  const layer = document.getElementById("snowLayer");
  layer.classList.toggle("active", !!on);
  if(!on){ layer.innerHTML=""; return; }

  // generate flakes
  layer.innerHTML="";
  for(let i=0;i<45;i++){
    const s=document.createElement("span");
    s.className="snowflake";
    s.textContent="❄";
    const left = Math.random()*100;
    const dur = 3 + Math.random()*6;
    const size = 10 + Math.random()*14;
    const dx = (-10 + Math.random()*20).toFixed(1) + "vw";
    s.style.left = left + "vw";
    s.style.fontSize = size + "px";
    s.style.animationDuration = dur + "s";
    s.style.setProperty("--dx", dx);
    s.style.opacity = (0.4 + Math.random()*0.6).toFixed(2);
    // random delay by spawning lower
    s.style.top = (-20 - Math.random()*80) + "px";
    layer.appendChild(s);

    // restart animation loop
    s.addEventListener("animationend", () => {
      if(!layer.classList.contains("active")) return;
      s.style.left = (Math.random()*100)+"vw";
      s.style.fontSize = (10 + Math.random()*14)+"px";
      s.style.animationDuration = (3 + Math.random()*6)+"s";
      s.style.setProperty("--dx", (-10 + Math.random()*20).toFixed(1) + "vw");
      s.style.opacity = (0.4 + Math.random()*0.6).toFixed(2);
      s.style.top = "-12px";
      // reflow
      void s.offsetWidth;
      s.style.animationName = "snowFall";
    }, { once:false });
  }
}

function applyStudentVisuals(st, inventoryIds){
  // Theme
  document.body.classList.toggle("theme-winter", !!st.profile.winterThemeEnabled);

  // Snow only when winter theme is enabled
  snowSetActive(!!st.profile.winterThemeEnabled && !!st.profile.snowEnabled);

  // Avatar
  const avatar = document.getElementById("avatarBig");
  if(!avatar) return;

  avatar.classList.remove("frame-gold","frame-neon","frame-silver","anim-pulse","anim-bounce","anim-glow");

  // Frame
  const hasFrame = inventoryIds?.includes("it_frame");
  if (hasFrame && st.profile.frameEnabled){
    const m = { gold:"frame-gold", neon:"frame-neon", silver:"frame-silver" };
    avatar.classList.add(m[st.profile.frameStyle] || "frame-gold");
  }

  // Avatar anim
  const hasAnim = inventoryIds?.includes("it_avatar");
  if (hasAnim && st.profile.avatarAnimEnabled){
    const a = { pulse:"anim-pulse", bounce:"anim-bounce", glow:"anim-glow" };
    avatar.classList.add(a[st.profile.avatarAnimEffect] || "anim-pulse");
  }

  // If avatar is an image background, keep it; CSS classes only add effects
}

function getLessonNumbersForClass(clsId){
  const db = dbLoad();
  const items = (db.schedule || db.schedules || []);
  // This project stores schedule in db.scheduleItems (teacher adds). We'll support both.
  let lessons = [];
  if (Array.isArray(items)){
    lessons = items.filter(x=>x.classId===clsId);
  } else if (items && typeof items === "object"){
    // object keyed by classId
    lessons = items[clsId] || [];
  }
  // If we have lesson numbers in schedule entries, use them; else just offer 1..8
  const nums = new Set();
  lessons.forEach((l, idx) => {
    if (l.lessonNo != null) nums.add(Number(l.lessonNo));
  });
  if (nums.size === 0) return [1,2,3,4,5,6,7,8];
  return Array.from(nums).sort((a,b)=>a-b);
}

function askLessonNo(clsId, title){
  const nums = getLessonNumbersForClass(clsId);
  const msg = `${title}\nВиберіть номер уроку: ${nums.join(", ")}\n(впишіть число)`;
  const raw = prompt(msg, String(nums[0]||1));
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n<=0) return null;
  return n;
}


function studentRenderProfile(studentId) {
  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if (!st) return;
  studentEnsureSettings(st);

  const cls = db.classes.find(c=>c.id===st.classId);
  const inventoryIds = st.inventory || [];

  $("#spName").textContent = st.name || "—";
  $("#spClass").textContent = cls ? cls.name : "—";
  $("#spCoins").textContent = st.coins || 0;
  $("#spPoints").textContent = st.points || 0;

  // Avatar (emoji or uploaded image)
  const avatarEl = $("#avatarBig");
  if (st.avatarDataUrl) {
    avatarEl.textContent = "";
    avatarEl.style.backgroundImage = `url(${st.avatarDataUrl})`;
    avatarEl.style.backgroundSize = "cover";
    avatarEl.style.backgroundPosition = "center";
  } else {
    avatarEl.style.backgroundImage = "";
    avatarEl.textContent = "🎓";
  }

  // Collection (owned items)
  const box = $("#collectionBox");
  box.innerHTML = "";
  const items = (db.shopItems||[]).filter(i => inventoryIds.includes(i.id));
  if (items.length === 0) {
    box.innerHTML = `<div class="muted small">Поки що порожньо. Купуйте товари в магазині 😊</div>`;
  } else {
    items.forEach(i => {
      const row = document.createElement("div");
      row.className = "collection-item";
      row.innerHTML = `
        <div class="collection-ico">${i.icon || "⭐"}</div>
        <div>
          <div class="collection-title">${i.title}</div>
          <div class="collection-sub">${i.desc || ""}</div>
        </div>
      `;
      box.appendChild(row);
    });
  }

  // Equipped pills
  const equip = $("#equipList");
  equip.innerHTML = "";
  function addPill(icon, label){
    const p = document.createElement("span");
    p.className = "equip-pill";
    p.innerHTML = `${icon} <b>${label}</b>`;
    equip.appendChild(p);
  }

  const hasFrame = inventoryIds.includes("it_frame");
  const hasAnim = inventoryIds.includes("it_avatar");
  const hasWinter = inventoryIds.includes("it_theme");

  if (hasFrame && st.profile.frameEnabled) addPill("🖼️", "Рамка: " + (st.profile.frameStyle==="neon"?"Неон":st.profile.frameStyle==="silver"?"Срібна":"Золота"));
  if (hasAnim && st.profile.avatarAnimEnabled) addPill("🧑", "Аватар: " + (st.profile.avatarAnimEffect==="bounce"?"Стрибок":st.profile.avatarAnimEffect==="glow"?"Світіння":"Пульс"));
  if (hasWinter && st.profile.winterThemeEnabled) addPill("❄️", "Тема: Зима");
  if (hasWinter && st.profile.winterThemeEnabled && st.profile.snowEnabled) addPill("🌨️", "Сніг: увімкнено");

  // Settings UI
  const frameStyleSelect = $("#frameStyleSelect");
  const frameEnabled = $("#frameEnabled");
  const winterThemeEnabled = $("#winterThemeEnabled");
  const snowEnabled = $("#snowEnabled");
  const avatarAnimEnabled = $("#avatarAnimEnabled");
  const avatarAnimEffect = $("#avatarAnimEffect");

  // lock controls until purchased
  frameStyleSelect.disabled = !hasFrame;
  frameEnabled.disabled = !hasFrame;

  avatarAnimEnabled.disabled = !hasAnim;
  avatarAnimEffect.disabled = !hasAnim;

  winterThemeEnabled.disabled = !hasWinter;
  snowEnabled.disabled = !hasWinter;

  // values
  frameStyleSelect.value = st.profile.frameStyle;
  frameEnabled.checked = !!st.profile.frameEnabled;

  winterThemeEnabled.checked = !!st.profile.winterThemeEnabled;
  snowEnabled.checked = !!st.profile.snowEnabled;

  avatarAnimEnabled.checked = !!st.profile.avatarAnimEnabled;
  avatarAnimEffect.value = st.profile.avatarAnimEffect;

  function saveAndApply(){
    const db2 = dbLoad();
    const st2 = db2.users.find(u => u.id===studentId && u.role==="student");
    if (!st2) return;
    studentEnsureSettings(st2);

    st2.profile.frameStyle = frameStyleSelect.value;
    st2.profile.frameEnabled = frameEnabled.checked;

    st2.profile.winterThemeEnabled = winterThemeEnabled.checked;
    st2.profile.snowEnabled = snowEnabled.checked;

    st2.profile.avatarAnimEnabled = avatarAnimEnabled.checked;
    st2.profile.avatarAnimEffect = avatarAnimEffect.value;

    dbSave(db2);
    applyStudentVisuals(st2, st2.inventory||[]);
    // refresh pills
    studentRenderProfile(studentId);
  }

  [frameStyleSelect, frameEnabled, winterThemeEnabled, snowEnabled, avatarAnimEnabled, avatarAnimEffect].forEach(el=>{
    if(!el) return;
    el.onchange = saveAndApply;
  });

  // Privileges box
  const privBox = $("#privilegesBox");
  if (privBox){
    privBox.innerHTML = "";
    function privRow(icon, title, obj, owned){
      const wrap = document.createElement("div");
      wrap.className = "collection-item";
      const status = !owned ? `<span class="muted small">Не куплено</span>` :
        (obj && (obj.subject || obj.time || obj.day)) ?
          `<span class="muted small">` +
          (obj.subject ? `Предмет: <b>${obj.subject}</b>` : ``) +
          (obj.time ? ` · Час: <b>${obj.time}</b>` : ``) +
          (obj.day ? ` · День: <b>${obj.day}</b>` : ``) +
          ` · ${obj.used ? "використано" : "доступно"}</span>` :
          `<span class="muted small">Не налаштовано (купіть або виберіть)</span>`;
      wrap.innerHTML = `
        <div class="collection-ico">${icon}</div>
        <div style="flex:1">
          <div class="collection-title">${title}</div>
          <div class="collection-sub">${status}</div>
        </div>
      `;
      privBox.appendChild(wrap);
    }
    privRow("🚪","Пропуск уроку", st.privileges.skip, inventoryIds.includes("it_skip"));
    privRow("⏱️","+1 день на здачу", st.privileges.extraTime, inventoryIds.includes("it_time"));
    privRow("🛡️","Захист від двійки (2→4)", st.privileges.shield, inventoryIds.includes("it_shield"));
  }

  // Apply visuals
  applyStudentVisuals(st, inventoryIds);

  // Avatar upload
  $("#avatarFile").onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const db2 = dbLoad();
      const st2 = db2.users.find(u => u.id===studentId && u.role==="student");
      if (!st2) return;
      st2.avatarDataUrl = reader.result;
      dbSave(db2);
      studentRenderProfile(studentId);
    };
    reader.readAsDataURL(file);
  };
}


/* ===== SHOP (exchange tab) ===== */
function studentRenderShop(studentId, tab="all") {
  const { db, st, inventoryIds } = studentGetData(studentId);
  $("#shopCoins").textContent = String(st.coins||0);

  const exchangeWrap = $("#shopExchangeWrap");
  const grid = $("#shopGrid");

  document.querySelectorAll(".shop-tab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
    b.onclick = () => studentRenderShop(studentId, b.dataset.tab);
  });

  if (tab === "exchange") {
    exchangeWrap.classList.remove("hidden");
    grid.classList.add("hidden");

    exchangeWrap.innerHTML = `
      <div class="card" style="margin-top:12px;">
        <h3>Обмін балів на монети</h3>
        <p class="muted small" style="margin-top:6px;">Курс: <b>10 балів = 1 монета</b></p>
        <div class="row gap wrap" style="margin-top:10px;">
          <input id="exchangePoints" placeholder="Скільки балів обміняти? (кратно 10)" />
          <button class="btn btn-green" id="btnExchangePoints">Обміняти</button>
        </div>
        <div class="muted small" id="exchangeMsg" style="margin-top:10px;"></div>
      </div>
    `;

    $("#btnExchangePoints").onclick = () => studentExchangePoints(studentId);
    return;
  }

  exchangeWrap.classList.add("hidden");
  grid.classList.remove("hidden");

  const items = db.shopItems.filter(it => tab==="all" ? true : it.tab === tab);
  grid.innerHTML = items.map(it => {
    const owned = inventoryIds.has(it.id);
    const canBuy = (st.coins||0) >= it.price && !owned;
    const extra = shopExtraControls(studentId, it, owned, st);

    return `
      <div class="shop-item">
        <div class="shop-ico">${it.icon}</div>
        <div class="shop-title">${it.title}</div>
        <div class="shop-desc">${it.desc}</div>
        <div class="shop-buy">
          <div class="price">${it.price} 🪙</div>
          <button class="buybtn" data-item="${it.id}" ${canBuy?"":"disabled"}>
            ${owned ? "Куплено" : (canBuy ? "Купити" : "Не вистачає")}
          </button>
        </div>
        ${extra}
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".buybtn").forEach(btn => {
    btn.onclick = () => studentBuyItem(studentId, btn.dataset.item, tab);
  });

  // Bind inline config actions
  grid.querySelectorAll("[data-action='frameStyle']").forEach(sel=>{
    sel.onchange = () => shopSetFrameStyle(sel.dataset.student, sel.value);
  });
  grid.querySelectorAll("[data-action='avatarEffect']").forEach(sel=>{
    sel.onchange = () => shopSetAvatarEffect(sel.dataset.student, sel.value);
  });
  grid.querySelectorAll("[data-action='chooseSkip']").forEach(b=>{
    b.onclick = () => shopChooseSkip(b.dataset.student);
  });
  grid.querySelectorAll("[data-action='chooseExtraTime']").forEach(b=>{
    b.onclick = () => shopChooseExtraTime(b.dataset.student);
  });
  grid.querySelectorAll("[data-action='chooseShield']").forEach(b=>{
    b.onclick = () => shopChooseShield(b.dataset.student);
  });

  grid.querySelectorAll("[data-action='extraSubject']").forEach(sel=>{
    sel.onchange = () => shopSetExtraSubject(sel.dataset.student, sel.value);
  });
  grid.querySelectorAll("[data-action='shieldSubject']").forEach(sel=>{
    sel.onchange = () => shopSetShieldSubject(sel.dataset.student, sel.value);
  });
  grid.querySelectorAll("[data-action='skipSlot']").forEach(sel=>{
    sel.onchange = () => shopSetSkipSlot(sel.dataset.student, sel.value);
  });

}


function studentBuyItem(studentId, itemId, currentTab) {
  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  const item = db.shopItems.find(i => i.id === itemId);
  if (!st || !item) return;

  st.inventory = st.inventory || [];
  studentEnsureSettings(st);

  if (st.inventory.includes(itemId)) return;
  if ((st.coins||0) < item.price) { alert("Недостатньо монет"); return; }

  // buy
  st.coins -= item.price;
  st.inventory.push(itemId);
  db.purchases.push({ id: uid(), studentId, itemId, purchasedAt: Date.now() });

  // configure right after purchase
  if (itemId === "it_frame") {
    // тільки відкриваємо можливість, НЕ вмикаємо автоматично
    st.profile.frameEnabled = st.profile.frameEnabled || false;
  }

if (itemId === "it_avatar") {
    // тільки відкриваємо можливість, НЕ вмикаємо автоматично
    st.profile.avatarAnimEnabled = st.profile.avatarAnimEnabled || false;
  }

if (itemId === "it_theme") {
    st.profile.winterThemeEnabled = true;
    st.profile.snowEnabled = true;
  }

  if (itemId === "it_skip") {
    // вибір уроку робиться в магазині після покупки
    st.privileges.skip = st.privileges.skip || { used:false };
  }

  if (itemId === "it_time") {
    // вибір предмету робиться в магазині після покупки
    st.privileges.extraTime = st.privileges.extraTime || { used:false };
  }

  if (itemId === "it_shield") {
    // вибір предмету робиться в магазині після покупки
    st.privileges.shield = st.privileges.shield || { used:false };
  }

  dbSave(db);

  const cls = db.classes.find(c=>c.id===st.classId);
  studentUpdateTopbar(st, cls);
  studentRenderShop(studentId, currentTab);
  studentRenderProfile(studentId);
  studentRenderHome(studentId);
}


/* =========================
   OPEN TEACHER APP
   ========================= */
function openTeacherApp(teacherId) {
  const teacher = getTeacher(teacherId);
  if (!teacher) { logout(); return; }

  sessionSave({ userId: teacherId, role:"teacher", ts:Date.now() });

  $("#topTeacherName").textContent = teacher.name;
  $("#topTeacherSubject").textContent = `(${teacher.subject})`;

  showOnly("#screenTeacherApp");

  fillScheduleSubjectsSelect();

  teacherFillSelects(teacher);
  teacherRenderStudents(teacher);
  teacherRenderTeacherGradesList(teacherId);
  teacherRenderScheduleList(teacherId);

  document.querySelectorAll(".teacher-sidebar .nav-item").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".teacher-sidebar .nav-item").forEach(b => b.classList.toggle("active", b===btn));
      const page = btn.dataset.tpage;

      ["#tPagePanel","#tPageGrades","#tPageSchedule","#tPageProfile"].forEach(h => hide(h));
      if (page === "panel") show("#tPagePanel");
      if (page === "grades") show("#tPageGrades");
      if (page === "schedule") show("#tPageSchedule");
      if (page === "profile") { show("#tPageProfile"); teacherRenderProfile(teacherId); }
    };
  });

  $("#panelClassSelect").onchange = () => {
    teacherRenderStudents(teacher);
    $("#studentClassSelect").value = $("#panelClassSelect").value;
  };

  const pullBtn = $("#btnPullStudents");
  if (pullBtn) pullBtn.onclick = () => teacherRenderStudents(teacher);

  $("#btnOpenAddStudent").onclick = () => {
    show("#addStudentCard");
    $("#studentClassSelect").value = $("#panelClassSelect").value;

    // щоб можна було вручну
    $("#studentFullName").value = "";
    $("#studentLogin").value = "";
    $("#studentPassword").value = "";
    $("#addStudentMsg").textContent = "";
  };

  $("#btnCloseAddStudent").onclick = () => hide("#addStudentCard");
  $("#btnGenerateCreds").onclick = () => teacherGenerateCredsUI();
  $("#btnSaveStudent").onclick = () => teacherSaveStudentUI(teacher);

  $("#btnExportStudentsXlsx").onclick = () => teacherExportStudentsExcel();

  $("#tGradesClass").onchange = () => teacherFillStudentsDropdown(teacher, $("#tGradesClass").value);
  $("#btnTeacherAddGrade").onclick = () => teacherAddGrade(teacherId);

  $("#btnTeacherAddLesson").onclick = () => teacherAddLesson(teacherId);
  $("#tSchClass").onchange = () => teacherRenderScheduleList(teacherId);

  $("#btnLogoutTeacher").onclick = () => logout();
}

/* =========================
   OPEN STUDENT APP
   ========================= */
function openStudentApp(studentId) {
  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if (!st) { logout(); return; }
  const cls = db.classes.find(c => c.id === st.classId);

  sessionSave({ userId: studentId, role:"student", ts:Date.now() });

  showOnly("#screenStudentApp");
  studentUpdateTopbar(st, cls);

  studentInitGradesFilter(studentId);
  studentRenderHome(studentId);
  studentRenderGrades(studentId);
  studentRenderSchedule(studentId, 1);
  studentRenderMotivation(studentId);
  studentRenderProfile(studentId);
  studentRenderShop(studentId, "all");

  document.querySelectorAll(".student-sidebar .nav-item").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".student-sidebar .nav-item").forEach(b => b.classList.toggle("active", b===btn));
      const page = btn.dataset.spage;

      ["#sPageHome","#sPageGrades","#sPageSchedule","#sPageMotivation","#sPageProfile","#sPageShop"].forEach(h => hide(h));
      if (page === "home") { show("#sPageHome"); studentRenderHome(studentId); }
      if (page === "grades") { show("#sPageGrades"); studentInitGradesFilter(studentId); studentRenderGrades(studentId); }
      if (page === "schedule") { show("#sPageSchedule"); studentRenderSchedule(studentId, Number(document.querySelector(".daytab.active")?.dataset.day || 1)); }
      if (page === "motivation") { show("#sPageMotivation"); studentRenderMotivation(studentId); }
      if (page === "profile") { show("#sPageProfile"); studentRenderProfile(studentId); }
      if (page === "shop") { show("#sPageShop"); studentRenderShop(studentId, document.querySelector(".shop-tab.active")?.dataset.tab || "all"); }
    };
  });

  document.querySelectorAll(".daytab").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".daytab").forEach(x => x.classList.toggle("active", x===b));
      studentRenderSchedule(studentId, Number(b.dataset.day));
    };
  });

  $("#avatarFile").onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const db2 = dbLoad();
      const st2 = db2.users.find(u => u.id===studentId && u.role==="student");
      if (!st2) return;

      st2.avatarDataUrl = reader.result;
      dbSave(db2);
      studentRenderProfile(studentId);
    };
    reader.readAsDataURL(file);
  };

  $("#btnLogoutStudent").onclick = () => logout();
}

/* =========================
   PUBLIC UI
   ========================= */
function initPublic() {
  ensureSnowLayer();
  $("#btnGoStudent").onclick = () => showOnly("#screenStudentLogin");
  $("#btnGoTeacher").onclick = () => showOnly("#screenTeacherAuth");
  $("#btnGoTeacherLogin").onclick = () => showOnly("#screenTeacherLogin");

  fillScheduleSubjectsSelect();

  $("#btnBackFromStudent").onclick = () => showOnly("#screenRole");
  $("#btnBackFromTeacher").onclick = () => showOnly("#screenRole");
  $("#btnBackFromTeacherLogin").onclick = () => showOnly("#screenRole");


  $("#linkOnlyTeacher").onclick = (e) => { e.preventDefault(); showOnly("#screenTeacherAuth"); };

  $("#btnTeacherRegister").onclick = () => {
    $("#tErr").classList.add("hidden");

    const p1 = $("#tPass").value;
    const p2 = $("#tPassRepeat").value;
    if (p1 !== p2) {
      $("#tErr").textContent = "Паролі не співпадають";
      $("#tErr").classList.remove("hidden");
      return;
    }

    const res = teacherRegister({
      name: $("#tName").value,
      subject: $("#tSubject").value,
      login: $("#tLogin").value,
      password: p1
    });
    if (!res.ok) {
      $("#tErr").textContent = res.msg;
      $("#tErr").classList.remove("hidden");
      return;
    }
    alert("Вчителя зареєстровано ✅ Тепер увійдіть.");
    $("#tLogin2").value = $("#tLogin").value.trim();
    $("#tPass2").value = "";
    showOnly("#screenTeacherLogin");
  };

  $("#linkTeacherLogin").onclick = (e) => { e.preventDefault(); showOnly("#screenTeacherLogin"); };

  $("#btnTeacherLogin").onclick = () => {
    $("#tErr2").classList.add("hidden");
    const res = loginUser("teacher", $("#tLogin2").value, $("#tPass2").value);
    if (!res.ok) {
      $("#tErr2").textContent = res.msg;
      $("#tErr2").classList.remove("hidden");
      return;
    }
    // logged in
    openTeacherApp(res.user.id);
  };

  $("#btnStudentLogin").onclick = () => {
    $("#sErr").classList.add("hidden");
    const res = loginUser("student", $("#sLogin").value, $("#sPass").value);
    if (!res.ok) {
      $("#sErr").textContent = res.msg;
      $("#sErr").classList.remove("hidden");
      return;
    }
    openStudentApp(res.user.id);
  };

  function bindToggle(checkId, ...inputIds) {
    const chk = $(checkId);
    if (!chk) return;
    chk.onchange = () => {
      const type = chk.checked ? "text" : "password";
      inputIds.forEach(id => { const el = $(id); if (el) el.type = type; });
    };
  }
  bindToggle("#toggleStudentPass", "#sPass");
  bindToggle("#toggleTeacherPass", "#tPass", "#tPassRepeat");
  bindToggle("#toggleTeacherLoginPass", "#tPass2");
}

initPublic();

/* =========================
   RESTORE SESSION
   ========================= */
(function restore() {
  const sess = sessionLoad();
  if (!sess) { showOnly("#screenRole"); return; }
  const db = dbLoad();
  const u = db.users.find(x => x.id === sess.userId);
  if (!u) { logout(); return; }
  if (u.role === "teacher") openTeacherApp(u.id);
  if (u.role === "student") openStudentApp(u.id);
})();



// ===== Privileges selection helpers (subject / time) =====
function getScheduleSlotsForClass(clsId){
  const db = dbLoad();
  const sch = db.schedules && db.schedules[clsId];
  const dayNames = { "1":"Пн","2":"Вт","3":"Ср","4":"Чт","5":"Пт","6":"Сб","7":"Нд" };
  const slots = [];
  if (!sch) return slots;
  Object.keys(sch).forEach(day=>{
    (sch[day]||[]).forEach(ls=>{
      slots.push({ day, dayName: dayNames[String(day)]||day, time: ls.time, subject: ls.subject, room: ls.room });
    });
  });
  // keep stable order: by day then time (string)
  slots.sort((a,b)=> (Number(a.day)-Number(b.day)) || String(a.time).localeCompare(String(b.time)));
  return slots;
}

function askSkipLessonSlot(clsId, title){
  const slots = getScheduleSlotsForClass(clsId);
  if (!slots.length){
    alert("Спочатку вчитель має додати розклад для цього класу.");
    return null;
  }
  const lines = slots.map((s,i)=> `${i+1}) ${s.dayName} • ${s.time} • ${s.subject}`);
  const raw = prompt(`${title}\nОберіть урок (впишіть номер):\n${lines.join("\n")}`, "1");
  if (!raw) return null;
  const idx = Number(raw);
  if (!Number.isFinite(idx) || idx<1 || idx>slots.length) return null;
  return slots[idx-1];
}

function askSubjectFromSchedule(clsId, title){
  const slots = getScheduleSlotsForClass(clsId);
  if (!slots.length){
    alert("Спочатку вчитель має додати розклад для цього класу.");
    return null;
  }
  const subjects = [...new Set(slots.map(s=>s.subject))].sort((a,b)=>String(a).localeCompare(String(b)));
  const raw = prompt(`${title}\nОберіть предмет (впишіть номер):\n` + subjects.map((s,i)=>`${i+1}) ${s}`).join("\n"), "1");
  if (!raw) return null;
  const idx = Number(raw);
  if (!Number.isFinite(idx) || idx<1 || idx>subjects.length) return null;
  return subjects[idx-1];
}


function shopExtraControls(studentId, it, owned, st){
  if(!owned) return "";
  const clsId = st.classId;

  // Profile items
  if(it.id === "it_frame"){
    const val = (st.profile && st.profile.frameStyle) ? st.profile.frameStyle : "gold";
    return `
      <div class="shop-config" data-for="${it.id}">
        <div class="muted small">Стиль рамки</div>
        <select class="select w100" data-action="frameStyle" data-student="${studentId}">
          <option value="gold" ${val==="gold"?"selected":""}>Золота</option>
          <option value="neon" ${val==="neon"?"selected":""}>Неон</option>
          <option value="silver" ${val==="silver"?"selected":""}>Срібна</option>
        </select>
        <div class="muted small">Увімкнення/вимкнення — у «Мій профіль»</div>
      </div>`;
  }

  if(it.id === "it_avatar"){
    const val = (st.profile && st.profile.avatarAnimEffect) ? st.profile.avatarAnimEffect : "pulse";
    return `
      <div class="shop-config" data-for="${it.id}">
        <div class="muted small">Ефект анімації</div>
        <select class="select w100" data-action="avatarEffect" data-student="${studentId}">
          <option value="pulse" ${val==="pulse"?"selected":""}>Пульс</option>
          <option value="float" ${val==="float"?"selected":""}>Плавання</option>
          <option value="glow" ${val==="glow"?"selected":""}>Світіння</option>
        </select>
        <div class="muted small">Увімкнення/вимкнення — у «Мій профіль»</div>
      </div>`;
  }

  // Build subjects list from schedule
  const slots = getScheduleSlotsForClass(clsId);
  const subjects = [...new Set(slots.map(s=>s.subject))].sort((a,b)=>String(a).localeCompare(String(b)));
  const subjOptions = ['<option value="">Всі предмети</option>'].concat(subjects.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)).join("");

  // Privileges
  if(it.id === "it_time"){
    const p = (st.privileges && st.privileges.extraTime) ? st.privileges.extraTime : null;
    const cur = (p && p.subject) ? p.subject : "";
    return `
      <div class="shop-config" data-for="${it.id}">
        <div class="muted small">Обрано: <b>${cur ? escapeHtml(cur) : "—"}</b></div>
        <select class="select w100" data-action="extraSubject" data-student="${studentId}">
          ${subjOptions.replace(`value="${escapeHtml(cur)}"`, `value="${escapeHtml(cur)}" selected`)}
        </select>
      </div>`;
  }

  if(it.id === "it_shield"){
    const p = (st.privileges && st.privileges.shield) ? st.privileges.shield : null;
    const cur = (p && p.subject) ? p.subject : "";
    return `
      <div class="shop-config" data-for="${it.id}">
        <div class="muted small">Обрано: <b>${cur ? escapeHtml(cur) : "—"}</b></div>
        <select class="select w100" data-action="shieldSubject" data-student="${studentId}">
          ${subjOptions.replace(`value="${escapeHtml(cur)}"`, `value="${escapeHtml(cur)}" selected`)}
        </select>
      </div>`;
  }

  if(it.id === "it_skip"){
    const p = (st.privileges && st.privileges.skip) ? st.privileges.skip : null;
    const curKey = (p && p.day && p.time && p.subject) ? `${p.day}|${p.time}|${p.subject}` : "";
    const slotOpts = ['<option value="">Виберіть урок</option>'].concat(
      slots.map(s=>{
        const key = `${s.day}|${s.time}|${s.subject}`;
        const label = `${s.dayName} • ${s.time} • ${s.subject}`;
        return `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`;
      })
    ).join("");
    const chosenLabel = p ? `${p.subject||""} • ${p.time||""} • ${p.day||""}` : "";
    return `
      <div class="shop-config" data-for="${it.id}">
        <div class="muted small">Обрано: <b>${curKey ? escapeHtml(chosenLabel) : "—"}</b></div>
        <select class="select w100" data-action="skipSlot" data-student="${studentId}">
          ${slotOpts.replace(`value="${escapeHtml(curKey)}"`, `value="${escapeHtml(curKey)}" selected`)}
        </select>
      </div>`;
  }

  return "";
}

function shopSetFrameStyle(studentId, style){
  const db = dbLoad();
  const st = db.users.find(u=>u.id===studentId && u.role==="student");
  if(!st) return;
  studentEnsureSettings(st);
  st.profile.frameStyle = ["gold","neon","silver"].includes(style) ? style : "gold";
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
  studentRenderHome(studentId);
}

function shopSetAvatarEffect(studentId, eff){
  const db = dbLoad();
  const st = db.users.find(u=>u.id===studentId && u.role==="student");
  if(!st) return;
  studentEnsureSettings(st);
  st.profile.avatarAnimEffect = ["pulse","float","glow"].includes(eff) ? eff : "pulse";
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
  studentRenderHome(studentId);
}

function shopChooseSkip(studentId){
  const { db, st } = studentGetData(studentId);
  const slot = askSkipLessonSlot(st.classId, "Пропуск уроку");
  if(!slot) return;
  st.privileges = st.privileges || {};
  st.privileges.skip = { day: slot.day, time: slot.time, subject: slot.subject, used:false };
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
}

function shopChooseExtraTime(studentId){
  const { db, st } = studentGetData(studentId);
  const subj = askSubjectFromSchedule(st.classId, "Додатковий час (+1 день)");
  if(!subj) return;
  st.privileges = st.privileges || {};
  st.privileges.extraTime = { subject: subj, used:false };
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
}

function shopChooseShield(studentId){
  const { db, st } = studentGetData(studentId);
  const subj = askSubjectFromSchedule(st.classId, "Захист від двійки (2→4)");
  if(!subj) return;
  st.privileges = st.privileges || {};
  st.privileges.shield = { subject: subj, used:false };
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
}

function escapeHtml(str){
  return String(str??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function shopSetExtraSubject(studentId, subject){
  const { db, st } = studentGetData(studentId);
  st.privileges = st.privileges || {};
  st.privileges.extraTime = st.privileges.extraTime || { used:false };
  st.privileges.extraTime.subject = subject || "";
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
}

function shopSetShieldSubject(studentId, subject){
  const { db, st } = studentGetData(studentId);
  st.privileges = st.privileges || {};
  st.privileges.shield = st.privileges.shield || { used:false };
  st.privileges.shield.subject = subject || "";
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
}

function shopSetSkipSlot(studentId, key){
  const { db, st } = studentGetData(studentId);
  if(!key){ 
    if(st.privileges && st.privileges.skip) st.privileges.skip = { used:false };
    dbSave(db);
    studentRenderShop(studentId);
    studentRenderProfile(studentId);
    return;
  }
  const [day,time,subject] = key.split("|");
  st.privileges = st.privileges || {};
  st.privileges.skip = { day, time, subject, used:false };
  dbSave(db);
  studentRenderShop(studentId);
  studentRenderProfile(studentId);
}
