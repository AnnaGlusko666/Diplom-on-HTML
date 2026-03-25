/* =========================
   TEACHER
   ========================= */

function teacherUpdateBell(teacherId){
  const n = msgUnreadCount(teacherId);
  const badge = document.getElementById("teacherBellCount");
  if(!badge) return;
  badge.textContent = String(n);
  badge.classList.toggle("hidden", n<=0);
}

function teacherFillSelects(teacher) {
  const db = dbLoad();
  const classes = db.classes.filter(c => teacher.classIds.includes(c.id));

  $("#panelClassSelect").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#studentClassSelect").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  $("#tGradesClass").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  $("#tSchClass").innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  const attSel = document.getElementById("attClassSelect");
  if(attSel){ attSel.innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join(""); }

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

function teacherRecalcGradeBadges(db, studentId) {
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if (!st) return;

  const currentBadges = Array.isArray(st.badgesEarned) ? st.badgesEarned.slice() : [];
  const oldRewardCoins = currentBadges.reduce((sum, badgeId) => {
    const badge = (db.badges || []).find(b => b.id === badgeId);
    return sum + Number(badge?.rewardCoins || 0);
  }, 0);

  st.badgesEarned = [];
  awardBadgesForStudent(db, studentId);

  const newRewardCoins = (st.badgesEarned || []).reduce((sum, badgeId) => {
    const badge = (db.badges || []).find(b => b.id === badgeId);
    return sum + Number(badge?.rewardCoins || 0);
  }, 0);

  st.coins = Math.max(0, Number(st.coins || 0) - oldRewardCoins);
  st.coins = Number(st.coins || 0) + newRewardCoins;
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
    teacherId: teacher.id,
    teacherName: teacher.name,
    createdAt: Date.now()
  });

  const deltaCoins = coinsByGrade(value);
  student.coins = Math.max(0, Number(student.coins||0) + deltaCoins);
  student.points = Math.max(0, Number(student.points||0) + value * 5);

  teacher.coinsGivenTotal = Number(teacher.coinsGivenTotal||0) + Math.max(0, deltaCoins);

  teacherRecalcGradeBadges(db, studentId);
  dbSave(db);

  $("#tGradesMsg").textContent = `Додано ✅ ${student.name}: ${value} | монети: ${deltaCoins >= 0 ? "+" : ""}${deltaCoins}`;
  $("#tGradesWork").value = "";
  $("#tGradesValue").value = "";

  teacherRenderTeacherGradesList(teacherId);
}

function teacherEditGrade(teacherId, gradeId) {
  const db = dbLoad();
  const teacher = getTeacher(teacherId);
  const grade = db.grades.find(g => g.id === gradeId);
  if (!teacher || !grade) return;
  if (grade.teacherId !== teacher.id && grade.teacherName !== teacher.name) return;

  const student = db.users.find(u => u.id === grade.studentId && u.role === "student");
  if (!student) return;

  modalShow({
    title: "Редагувати оцінку",
    bodyHTML: `
      <div class="muted small">Учень: <b>${escapeHtml(student.name || "—")}</b></div>
      <div class="row gap wrap" style="margin-top:12px;">
        <div style="flex:1; min-width:220px;">
          <label class="lbl">Тип роботи</label>
          <input id="editGradeWork" value="${escapeHtml(grade.work || "")}" />
        </div>
        <div style="width:160px;">
          <label class="lbl">Оцінка</label>
          <input id="editGradeValue" type="number" min="1" max="12" value="${Number(grade.value) || ""}" />
        </div>
      </div>
    `,
    actions: [
      { text:"Скасувати", className:"btn btn-ghost", onClick: modalClose },
      { text:"Зберегти", className:"btn btn-green", onClick: () => {
        const newWork = (document.getElementById("editGradeWork")?.value || "").trim();
        const newValue = Number((document.getElementById("editGradeValue")?.value || "").trim());

        if (!newWork) return alert("Вкажіть тип роботи");
        if (!Number.isFinite(newValue) || newValue < 1 || newValue > 12) return alert("Оцінка має бути 1-12");

        const oldValue = Number(grade.value || 0);
        const coinDiff = coinsByGrade(newValue) - coinsByGrade(oldValue);
        const pointsDiff = (newValue - oldValue) * 5;

        grade.work = newWork;
        grade.value = newValue;
        grade.updatedAt = Date.now();

        student.coins = Math.max(0, Number(student.coins || 0) + coinDiff);
        student.points = Math.max(0, Number(student.points || 0) + pointsDiff);
        teacher.coinsGivenTotal = Math.max(0, Number(teacher.coinsGivenTotal || 0) + Math.max(0, coinsByGrade(newValue)) - Math.max(0, coinsByGrade(oldValue)));

        teacherRecalcGradeBadges(db, student.id);
        dbSave(db);
        modalClose();
        $("#tGradesMsg").textContent = `Оцінку оновлено ✅ ${student.name}: ${oldValue} → ${newValue}`;
        teacherRenderTeacherGradesList(teacherId);
      }}
    ]
  });
}

function teacherDeleteGrade(teacherId, gradeId) {
  const db = dbLoad();
  const teacher = getTeacher(teacherId);
  const idx = db.grades.findIndex(g => g.id === gradeId);
  if (!teacher || idx < 0) return;

  const grade = db.grades[idx];
  if (grade.teacherId !== teacher.id && grade.teacherName !== teacher.name) return;

  const student = db.users.find(u => u.id === grade.studentId && u.role === "student");
  if (!student) return;

  modalShow({
    title: "Видалити оцінку?",
    bodyHTML: `
      <div>Учень: <b>${escapeHtml(student.name || "—")}</b></div>
      <div style="margin-top:8px;">${escapeHtml(grade.work || "—")} — <b>${grade.value}</b></div>
      <div class="muted small" style="margin-top:8px;">Дію не можна скасувати.</div>
    `,
    actions: [
      { text:"Скасувати", className:"btn btn-ghost", onClick: modalClose },
      { text:"Видалити", className:"btn btn-ghost", onClick: () => {
        db.grades.splice(idx, 1);
        student.coins = Math.max(0, Number(student.coins || 0) - coinsByGrade(Number(grade.value || 0)));
        student.points = Math.max(0, Number(student.points || 0) - Number(grade.value || 0) * 5);
        teacher.coinsGivenTotal = Math.max(0, Number(teacher.coinsGivenTotal || 0) - Math.max(0, coinsByGrade(Number(grade.value || 0))));

        teacherRecalcGradeBadges(db, student.id);
        dbSave(db);
        modalClose();
        $("#tGradesMsg").textContent = `Оцінку видалено 🗑️ ${student.name}: ${grade.value}`;
        teacherRenderTeacherGradesList(teacherId);
      }}
    ]
  });
}

function teacherRenderTeacherGradesList(teacherId) {
  const db = dbLoad();
  const teacher = getTeacher(teacherId);
  const host = $("#tGradesList");

  const last = db.grades
    .filter(g => g.teacherId === teacher.id || g.teacherName === teacher.name)
    .slice()
    .sort((a,b) => (b.createdAt||0) - (a.createdAt||0))
    .slice(0, 10);

  if (!last.length) { host.innerHTML = `<p class="muted">Поки немає оцінок.</p>`; return; }

  host.innerHTML = `
    <table class="table">
      <thead><tr><th>Учень</th><th>Предмет</th><th>Оцінка</th><th>Робота</th><th>Дата</th><th>Дії</th></tr></thead>
      <tbody>
        ${last.map(g => {
          const st = db.users.find(u => u.id === g.studentId);
          return `<tr>
            <td>${st?.name ?? "—"}</td>
            <td>${g.subject}</td>
            <td><b>${g.value}</b></td>
            <td>${g.work}</td>
            <td>${fmtDate(g.updatedAt || g.createdAt)}</td>
            <td>
              <div class="row gap wrap" style="margin:0;">
                <button class="btn btn-ghost" type="button" data-grade-edit="${g.id}">✏️</button>
                <button class="btn btn-ghost" type="button" data-grade-delete="${g.id}">🗑️</button>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;

  host.querySelectorAll("[data-grade-edit]").forEach(btn => {
    btn.onclick = () => teacherEditGrade(teacherId, btn.dataset.gradeEdit);
  });
  host.querySelectorAll("[data-grade-delete]").forEach(btn => {
    btn.onclick = () => teacherDeleteGrade(teacherId, btn.dataset.gradeDelete);
  });
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
   MESSAGES
   ========================= */
function teacherRenderMessages(teacherId){
  const db = dbLoad();
  const list = db.messages
    .filter(m => m.toUserId===teacherId || m.fromUserId===teacherId)
    .sort((a,b)=>b.createdAt-a.createdAt);

  const host = document.getElementById("tMessagesHost");
  if(!host) return;
  if(!list.length){ host.innerHTML = '<p class="muted">Немає повідомлень.</p>'; return; }

  host.innerHTML = list.map(m=>{
    const incoming = m.toUserId===teacherId;
    const from = db.users.find(u=>u.id===m.fromUserId);
    const to = db.users.find(u=>u.id===m.toUserId);
    const head = incoming ? `${from?.name||"—"} → Ви` : `Ви → ${to?.name||"—"}`;
    const kind = m.kind==="grade_question" ? "Питання щодо оцінки" : (m.kind==="reply" ? "Відповідь" : (m.kind==="award" ? "Нарахування" : m.kind));
    const canReply = incoming && m.kind==="grade_question";
    return `
      <div class="card" style="margin-bottom:10px;">
        <div class="row" style="justify-content:space-between; margin:0;">
          <div><b>${head}</b> <span class="badge ghost">${kind}</span></div>
          <div class="muted small">${fmtDate(m.createdAt)}</div>
        </div>
        <div style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(m.text||"")}</div>
        ${canReply ? `<div class="row" style="justify-content:flex-end;">
            <button class="btn btn-ghost" data-reply-msg="${m.id}">Відповісти</button>
          </div>` : ``}
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-reply-msg]").forEach(b=>{
    b.onclick = ()=> teacherReplyToMessage(teacherId, b.dataset.replyMsg);
  });
}

function teacherReplyToMessage(teacherId, msgId){
  const db = dbLoad();
  const m = db.messages.find(x=>x.id===msgId);
  if(!m) return;
  const student = db.users.find(u=>u.id===m.fromUserId);

  modalShow({
    title: "Відповідь учню",
    bodyHTML: `
      <div class="muted small">Учень: <b>${escapeHtml(student?.name||"—")}</b></div>
      <div style="margin-top:10px;">
        <label class="lbl">Ваша відповідь</label>
        <textarea id="teacherReplyText" rows="4" placeholder="Напишіть відповідь або домовтеся про перездачу..."></textarea>
      </div>
    `,
    actions: [
      {text:"Скасувати", className:"btn btn-ghost", onClick: modalClose},
      {text:"Надіслати", className:"btn", onClick: ()=>{
        const text=(document.getElementById("teacherReplyText")?.value||"").trim();
        if(!text) return;
        msgSend({
          fromUserId: teacherId,
          toUserId: m.fromUserId,
          kind: "reply",
          text,
          meta: { inReplyTo: m.id, gradeId: m.meta?.gradeId || null }
        });
        modalClose();
        teacherRenderMessages(teacherId);
        teacherUpdateBell(teacherId);
      }}
    ]
  });
}

/* =========================
   EXTRA (AWARDS)
   ========================= */
function teacherRenderExtra(teacherId){
  const db = dbLoad();
  const teacher = db.users.find(u=>u.id===teacherId && u.role==="teacher");
  if(!teacher) return;

  const classes = db.classes.filter(c => teacher.classIds.includes(c.id));
  const classSel = document.getElementById("extraClassSelect");
  classSel.innerHTML = classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");

  const targetSel = document.getElementById("extraTargetSelect");
  const studentWrap = document.getElementById("extraStudentWrap");
  const studentSel = document.getElementById("extraStudentSelect");

  function fillStudents(){
    const classId = classSel.value;
    const students = db.users.filter(u=>u.role==="student" && u.classId===classId);
    studentSel.innerHTML = students.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");
  }
  fillStudents();

  function syncTarget(){
    const isStudent = targetSel.value==="student";
    studentWrap.classList.toggle("hidden", !isStudent);
  }
  syncTarget();

  classSel.onchange = () => { fillStudents(); };
  targetSel.onchange = () => { syncTarget(); };

  document.getElementById("btnExtraSend").onclick = () => {
    const classId = classSel.value;
    const target = targetSel.value;
    const kind = document.getElementById("extraKindSelect").value; // points|coins
    const amount = Math.max(1, parseInt(document.getElementById("extraAmount").value||"1",10));
    const reason = (document.getElementById("extraReason").value||"").trim();

    const status = document.getElementById("extraStatus");
    status.textContent = "";

    if(!reason){ status.textContent = "Будь ласка, напишіть за що нарахування."; return; }

    const students = db.users.filter(u=>u.role==="student" && u.classId===classId);
    let targets = students;

    if(target==="student"){
      const sid = studentSel.value;
      targets = students.filter(s=>s.id===sid);
      if(!targets.length){ status.textContent="Оберіть учня."; return; }
    }

    targets.forEach(st=>{
      if(kind==="coins") st.coins = (st.coins||0) + amount;
      if(kind==="points") st.points = (st.points||0) + amount;

      db.messages.push({
        id: uid(),
        fromUserId: teacherId,
        toUserId: st.id,
        kind: "award",
        text: `${kind==="coins" ? "Нараховано монети" : "Нараховано бали"}: ${amount}.\nЗа що: ${reason}`,
        meta: { kind, amount, reason, classId, studentId: st.id },
        createdAt: Date.now(),
        read: false
      });
    });

    dbSave(db);
    status.textContent = `Нараховано: ${targets.length} учн.`;
    document.getElementById("extraReason").value = "";
  };
}

/* =========================
   ATTENDANCE (Teacher)
   ========================= */
function teacherRenderAttendance(teacherId){
  const db = dbLoad();
  const teacher = db.users.find(u => u.id===teacherId && u.role==="teacher");
  if(!teacher) return;

  // default date = today
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');

  const dateInp = document.getElementById("attDate");
  if(dateInp && !dateInp.value) dateInp.value = `${yyyy}-${mm}-${dd}`;

  const classSel = document.getElementById("attClassSelect");
  if(!classSel) return;

  // урок: dropdown from global list
  const lessonSel = document.getElementById("attLesson");
  if(lessonSel && !lessonSel.dataset.ready){
    const opts = [
      {v:"", t:"— не вказано —"},
      ...((window.SUBJECTS_UA||[]).map(s => ({v:s, t:s}))),
    ];
    lessonSel.innerHTML = opts.map(o => `<option value="${escapeHtml(o.v)}">${escapeHtml(o.t)}</option>`).join("");
    lessonSel.dataset.ready = "1";
  }

  const renderList = () => {
    const classId = classSel.value;
    const cls = db.classes.find(c => c.id===classId);
    const students = db.users.filter(u => u.role==="student" && u.classId===classId);

    const dateVal = (dateInp?.value||"").trim();
    const host = document.getElementById("attStudentsHost");
    if(!host) return;

    // load existing marks for this class/date
    const att = (db.attendance||[]).filter(a => a.classId===classId && a.date===dateVal);
    const presentSet = new Set(att.filter(a=>a.present).map(a=>a.studentId));

    if(!students.length){
      host.innerHTML = `<div class="muted">У цьому класі поки немає учнів.</div>`;
      return;
    }

    host.innerHTML = `
      <div class="muted" style="margin-bottom:8px;">Клас: <b>${escapeHtml(cls?.name||"—")}</b></div>
      <div class="card" style="padding:0; overflow:hidden;">
        <table class="att-table">
          <thead>
            <tr>
              <th style="text-align:left;">Учні</th>
              <th style="text-align:left; width:160px;">Був/не був</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(st => {
              const present = presentSet.has(st.id);
              return `
                <tr>
                  <td class="att-name">${escapeHtml(st.name)}</td>
                  <td class="att-mark">
                    <button type="button" class="attToggle" data-st="${escapeHtml(st.id)}" data-present="${present?"1":"0"}" title="Натисніть, щоб змінити">
                      ${present ? "✅" : "❌"}
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;

    host.querySelectorAll(".attToggle").forEach(btn => {
      btn.onclick = () => {
        const cur = btn.dataset.present === "1";
        const next = !cur;
        btn.dataset.present = next ? "1" : "0";
        btn.textContent = next ? "✅" : "❌";
      };
    });
  };

  classSel.onchange = renderList;
  if(dateInp) dateInp.onchange = renderList;

  renderList();

  const btn = document.getElementById("btnSaveAttendance");
  if(btn){
    btn.onclick = () => {
      const db2 = dbLoad();
      const teacher2 = db2.users.find(u => u.id===teacherId && u.role==="teacher");
      const classId = classSel.value;
      const dateVal = (document.getElementById("attDate")?.value||"").trim();
      const lesson = (document.getElementById("attLesson")?.value||"").trim();

      const msg = document.getElementById("attMsg");
      if(msg) msg.textContent = "";

      if(!dateVal){
        if(msg) msg.textContent = "Оберіть дату";
        return;
      }

      const host2 = document.getElementById("attStudentsHost");
      const toggles = host2 ? Array.from(host2.querySelectorAll(".attToggle")) : [];
      if(!toggles.length){
        if(msg) msg.textContent = "Немає учнів для відмітки";
        return;
      }

      // remove old marks for class/date (MVP)
      db2.attendance = (db2.attendance||[]).filter(a => !(a.classId===classId && a.date===dateVal));

      toggles.forEach(t => {
        const stId = t.dataset.st;
        const present = t.dataset.present === "1";
        db2.attendance.push({
          id: uid(),
          studentId: stId,
          classId,
          date: dateVal,
          lesson,
          present,
          teacherId: teacher2?.id || "",
          createdAt: Date.now()
        });
      });

      dbSave(db2);

      // award attendance badge automatically (next time student opens мотивацію/кабінет)
      // (optional) notify students for present mark
      toggles.forEach(t => {
        if(t.dataset.present === "1"){
          msgSend(t.dataset.st, `📅 Відвідуваність: відмічено <b>присутність</b> (${escapeHtml(dateVal)}${lesson?`, ${escapeHtml(lesson)}`:""})`);
        }
      });

      if(msg) msg.textContent = "Збережено ✅";
    };
  }
}
