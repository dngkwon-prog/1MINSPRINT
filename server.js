const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-this";
const DB_PATH = path.join(__dirname, "app.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'starter',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  email TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  gender TEXT NOT NULL,
  consent INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, tier: user.tier, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Missing token." });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token." });
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", (req, res) => {
  const { email, password, displayName } = req.body || {};
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "email, password, displayName are required." });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email).toLowerCase());
  if (existing) return res.status(409).json({ error: "Email already exists." });

  const totalUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const role = totalUsers === 0 ? "admin" : "user";
  const hash = bcrypt.hashSync(password, 10);
  const createdAt = new Date().toISOString();

  const result = db
    .prepare(
      "INSERT INTO users (email, password_hash, display_name, tier, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(String(email).toLowerCase(), hash, String(displayName), "starter", role, createdAt);

  const user = db
    .prepare("SELECT id, email, display_name AS displayName, tier, role, created_at AS createdAt FROM users WHERE id = ?")
    .get(result.lastInsertRowid);
  const token = signToken({ id: user.id, email: user.email, tier: user.tier, role: user.role });
  return res.status(201).json({ token, user });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password are required." });

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase());
  if (!row) return res.status(401).json({ error: "Invalid credentials." });
  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials." });

  const user = {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    tier: row.tier,
    role: row.role,
    createdAt: row.created_at
  };
  const token = signToken({ id: row.id, email: row.email, tier: row.tier, role: row.role });
  res.json({ token, user });
});

app.get("/api/me", authRequired, (req, res) => {
  const row = db
    .prepare("SELECT id, email, display_name AS displayName, tier, role, created_at AS createdAt FROM users WHERE id = ?")
    .get(req.user.sub);
  if (!row) return res.status(404).json({ error: "User not found." });
  res.json({ user: row });
});

app.patch("/api/users/:id/tier", authRequired, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin only." });
  }
  const allowed = new Set(["starter", "pro", "elite"]);
  const tier = String(req.body?.tier || "");
  if (!allowed.has(tier)) {
    return res.status(400).json({ error: "tier must be starter, pro, elite." });
  }
  const id = Number(req.params.id);
  const result = db.prepare("UPDATE users SET tier = ? WHERE id = ?").run(tier, id);
  if (!result.changes) return res.status(404).json({ error: "User not found." });
  const user = db
    .prepare("SELECT id, email, display_name AS displayName, tier, role, created_at AS createdAt FROM users WHERE id = ?")
    .get(id);
  res.json({ user });
});

app.post("/api/newsletter/subscribe", (req, res) => {
  const { email, country, gender, consent, source, userId } = req.body || {};
  if (!email || !country || !gender || !consent) {
    return res.status(400).json({ error: "email, country, gender, consent are required." });
  }

  try {
    db.prepare(
      "INSERT INTO newsletter_subscribers (user_id, email, country, gender, consent, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(userId || null, String(email).toLowerCase(), String(country), String(gender), consent ? 1 : 0, source || "landing-page", new Date().toISOString());
    return res.status(201).json({ ok: true });
  } catch {
    return res.status(409).json({ error: "Email is already subscribed." });
  }
});

app.listen(PORT, () => {
  console.log(`1MINSPRINT API running on http://localhost:${PORT}`);
});
