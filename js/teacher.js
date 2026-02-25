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

