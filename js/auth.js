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

