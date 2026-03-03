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

  document.querySelectorAll("[data-ask-grade]").forEach(btn=>{
    btn.onclick = () => studentAskGradeQuestion(studentId, btn.dataset.askGrade);
  });
}



function studentUpdateBell(studentId){
  const n = msgUnreadCount(studentId);
  const badge = document.getElementById("studentBellCount");
  if(!badge) return;
  badge.textContent = String(n);
  badge.classList.toggle("hidden", n<=0);
}

function studentRenderMessages(studentId){
  const db = dbLoad();
  const list = db.messages
    .filter(m => m.toUserId===studentId || m.fromUserId===studentId)
    .sort((a,b)=>b.createdAt-a.createdAt);

  const host = document.getElementById("sMessagesHost");
  if(!host) return;
  if(!list.length){ host.innerHTML = '<p class="muted">Немає повідомлень.</p>'; return; }

  host.innerHTML = list.map(m=>{
    const meOut = m.fromUserId===studentId;
    const from = db.users.find(u=>u.id===m.fromUserId);
    const to = db.users.find(u=>u.id===m.toUserId);
    const head = meOut ? `Ви → ${to?.name||"—"}` : `${from?.name||"—"} → Ви`;
    const kind = m.kind==="award" ? "Нарахування" : (m.kind==="grade_question" ? "Питання щодо оцінки" : (m.kind==="reply" ? "Відповідь" : m.kind));
    return `
      <div class="card" style="margin-bottom:10px;">
        <div class="row" style="justify-content:space-between; margin:0;">
          <div><b>${head}</b> <span class="badge ghost">${kind}</span></div>
          <div class="muted small">${fmtDate(m.createdAt)}</div>
        </div>
        <div style="margin-top:8px; white-space:pre-wrap;">${escapeHtml(m.text||"")}</div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-ask-grade]").forEach(btn=>{
    btn.onclick = () => studentAskGradeQuestion(studentId, btn.dataset.askGrade);
  });
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
                <div class="subject-meta">
                  <div class="muted small">${fmtDate(g.createdAt)}</div>
                  <button class="btn btn-ghost" data-ask-grade="${g.id}">Оскаржити / питання</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll("[data-ask-grade]").forEach(btn=>{
    btn.onclick = () => studentAskGradeQuestion(studentId, btn.dataset.askGrade);
  });
}



function studentAskGradeQuestion(studentId, gradeId){
  const db = dbLoad();
  const g = db.grades.find(x=>x.id===gradeId && x.studentId===studentId);
  if(!g){ return; }

  // find teacher who set the grade (best-effort)
  const teacher = db.users.find(u => u.role==="teacher" && u.name===g.teacherName && u.subject===g.subject)
              || db.users.find(u => u.role==="teacher" && u.subject===g.subject);

  if(!teacher){
    modalShow({
      title: "Не знайдено вчителя",
      bodyHTML: "<p class='muted'>Не вдалося визначити вчителя для цієї оцінки.</p>",
      actions: [{text:"OK", className:"btn"}]
    });
    return;
  }

  modalShow({
    title: "Оскаржити / задати питання",
    bodyHTML: `
      <div class="muted small">Предмет: <b>${escapeHtml(g.subject)}</b> • Робота: <b>${escapeHtml(g.work)}</b> • Оцінка: <b>${g.value}</b></div>
      <div style="margin-top:10px;">
        <label class="lbl">Ваше повідомлення</label>
        <textarea id="gradeAskText" rows="4" placeholder="Опишіть питання або попросіть про перездачу..."></textarea>
      </div>
    `,
    actions: [
      {text:"Скасувати", className:"btn btn-ghost", onClick: modalClose},
      {text:"Надіслати", className:"btn", onClick: () => {
        const text = (document.getElementById("gradeAskText")?.value||"").trim();
        if(!text){ return; }
        msgSend({
          fromUserId: studentId,
          toUserId: teacher.id,
          kind: "grade_question",
          text,
          meta: { gradeId: g.id, subject:g.subject, work:g.work, value:g.value, studentId }
        });
        modalClose();
        studentUpdateBell(studentId); // outgoing doesn't affect, but OK
        // show hint
        const host = document.getElementById("sMessagesHost");
        if(host) studentRenderMessages(studentId);
      }}
    ]
  });
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
  autoAwardBadgesForStudent(studentId);
  autoAwardRareForStudent(studentId);
  const { db, st } = studentGetData(studentId);
  const earned = new Set(st.badgesEarned||[]);
  const rareEarned = new Set(st.rareEarned||[]);

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

  const rare = (db.rareRewards||[]);
  $("#rareGrid").innerHTML = rare.map(r => {
    const ok = rareEarned.has(r.id);
    return `
      <div class="rare-card ${ok?"ok":""}">
        <div class="rare-title">${r.icon||"✨"} ${escapeHtml(r.title)}</div>
        <div class="rare-desc">${escapeHtml(r.desc||"")}</div>
        <div class="rare-status ${ok?"ok":""}">${ok?"Отримано ✅":"Не отримано"}</div>
        <div class="rare-reward">+${Number(r.rewardCoins||0)} 🪙</div>
      </div>
    `;
  }).join("");
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

  // Absences & badges counters
  const abs = (db.attendance||[]).filter(a => a.studentId===studentId && a.present === false).length;
  const earnedBadges = (st.badgesEarned||[]).length;
  $("#spAbsences").textContent = String(abs);
  $("#spBadgesEarned").textContent = String(earnedBadges);
  $("#spBadgesTotal").textContent = String((db.badges||[]).length);

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
