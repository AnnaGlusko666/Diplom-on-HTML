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

