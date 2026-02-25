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
