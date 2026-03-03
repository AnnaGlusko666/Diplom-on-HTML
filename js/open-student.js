/* =========================
   OPEN STUDENT APP
   ========================= */
function openStudentApp(studentId) {
  const db = dbLoad();
  const st = db.users.find(u => u.id===studentId && u.role==="student");
  if (!st) { logout(); return; }
  const cls = db.classes.find(c => c.id === st.classId);

  sessionSave({ userId: studentId, role:"student", ts:Date.now() });

  // reset any leaked visuals, then apply student visuals from profile
  resetGlobalVisuals();

  showOnly("#screenStudentApp");
  autoAwardBadgesForStudent(studentId);
  const { db:db2, st:st2, cls:cls2 } = studentGetData(studentId);
  studentUpdateTopbar(st2, cls2);


  studentInitGradesFilter(studentId);
  studentRenderHome(studentId);
  studentRenderGrades(studentId);
  studentRenderSchedule(studentId, 1);
  studentUpdateBell(studentId);
  $("#btnStudentBell").onclick = () => {
    document.querySelectorAll(".student-sidebar .nav-item").forEach(b => b.classList.toggle("active", b.dataset.spage==="messages"));
    ["#sPageHome","#sPageGrades","#sPageSchedule","#sPageMessages","#sPageProfile"].forEach(h=>hide(h));
    show("#sPageMessages");
    studentRenderMessages(studentId);
    msgMarkAllRead(studentId);
    studentUpdateBell(studentId);
  };

  studentRenderMotivation(studentId);
  studentRenderProfile(studentId);
  studentRenderShop(studentId, "all");

  document.querySelectorAll(".student-sidebar .nav-item").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".student-sidebar .nav-item").forEach(b => b.classList.toggle("active", b===btn));
      const page = btn.dataset.spage;

      ["#sPageHome","#sPageGrades","#sPageSchedule","#sPageMotivation","#sPageMessages","#sPageProfile","#sPageShop"].forEach(h => hide(h));
      if (page === "home") { show("#sPageHome"); studentRenderHome(studentId); }
      if (page === "grades") { show("#sPageGrades"); studentInitGradesFilter(studentId); studentRenderGrades(studentId); }
      if (page === "schedule") { show("#sPageSchedule"); studentRenderSchedule(studentId, Number(document.querySelector(".daytab.active")?.dataset.day || 1)); }
      if (page === "motivation") { show("#sPageMotivation"); studentRenderMotivation(studentId); }
      if (page === "messages") { show("#sPageMessages"); studentRenderMessages(studentId); msgMarkAllRead(studentId); studentUpdateBell(studentId); }
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

