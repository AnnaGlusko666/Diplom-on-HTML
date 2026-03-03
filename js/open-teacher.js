/* =========================
   OPEN TEACHER APP
   ========================= */
function openTeacherApp(teacherId) {
  const teacher = getTeacher(teacherId);
  if (!teacher) { logout(); return; }

  sessionSave({ userId: teacherId, role:"teacher", ts:Date.now() });

  // prevent student visual effects from leaking into teacher view
  resetGlobalVisuals();

  $("#topTeacherName").textContent = teacher.name;
  $("#topTeacherSubject").textContent = `(${teacher.subject})`;

  showOnly("#screenTeacherApp");

  fillScheduleSubjectsSelect();

  teacherFillSelects(teacher);
  teacherRenderStudents(teacher);
  teacherRenderTeacherGradesList(teacherId);
  teacherRenderScheduleList(teacherId);

  teacherUpdateBell(teacherId);
  $("#btnTeacherBell").onclick = () => {
    // switch to messages page
    document.querySelectorAll(".teacher-sidebar .nav-item").forEach(b => b.classList.toggle("active", b.dataset.tpage==="messages"));
    ["#tPagePanel","#tPageGrades","#tPageSchedule","#tPageAttendance","#tPageExtra","#tPageMessages","#tPageProfile"].forEach(h => hide(h));
    show("#tPageMessages");
    teacherRenderMessages(teacherId);
    msgMarkAllRead(teacherId);
    teacherUpdateBell(teacherId);
  };

  document.querySelectorAll(".teacher-sidebar .nav-item").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".teacher-sidebar .nav-item").forEach(b => b.classList.toggle("active", b===btn));
      const page = btn.dataset.tpage;

      ["#tPagePanel","#tPageGrades","#tPageSchedule","#tPageAttendance","#tPageExtra","#tPageMessages","#tPageProfile"].forEach(h => hide(h));
      if (page === "panel") show("#tPagePanel");
      if (page === "grades") show("#tPageGrades");
      if (page === "schedule") show("#tPageSchedule");
      if (page === "attendance") { show("#tPageAttendance"); teacherRenderAttendance(teacherId); }
      if (page === "extra") { show("#tPageExtra"); teacherRenderExtra(teacherId); }
      if (page === "messages") { show("#tPageMessages"); teacherRenderMessages(teacherId); msgMarkAllRead(teacherId); teacherUpdateBell(teacherId); }
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

