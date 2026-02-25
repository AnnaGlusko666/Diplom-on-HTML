const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "db.json");

function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}
function writeDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// Отримати всю базу
app.get("/db", (req, res) => {
  res.json(readDB());
});

// Зберегти всю базу (перезапис)
app.put("/db", (req, res) => {
  const db = req.body;
  writeDB(db);
  res.json({ ok: true });
});

// (Опційно) healthcheck
app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(3000, () => console.log("API running: http://localhost:3000"));