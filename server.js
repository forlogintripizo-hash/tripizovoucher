// server.js
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "submissions.json");

// Use environment variable for security
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@Tripizo@5100#";

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "tripizo_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Helper functions
function readSubmissions() {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}
function writeSubmissions(arr) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2), "utf8");
}

// Public submission form handler
app.post("/submit", (req, res) => {
  const { name, phone, email, address, voucher } = req.body;
  if (!name || !phone || !email || !voucher) {
    return res.status(400).send("Please fill in all required fields.");
  }

  const submissions = readSubmissions();
  const newEntry = {
    id: uuidv4(),
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: address.trim(),
    voucher: voucher.trim().toUpperCase(),
    createdAt: new Date().toISOString(),
    status: "new",
  };

  submissions.unshift(newEntry);
  writeSubmissions(submissions);

  res.send(`
    <div style="font-family: Arial; max-width:600px; margin:60px auto; text-align:center;">
      <h2 style="color:#0078d7">Thank you, ${escapeHtml(name)}!</h2>
      <p>Your voucher has been submitted successfully.</p>
      <a href="/" style="color:#0078d7">← Back to Home</a>
    </div>
  `);
});

// Admin login and dashboard
app.get("/admin", (req, res) => {
  if (req.session && req.session.authenticated) {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
  } else {
    res.send(`
      <div style="font-family:Arial; max-width:400px; margin:100px auto;">
        <h2 style="color:#0078d7;">Admin Login</h2>
        <form method="POST" action="/admin/login">
          <input name="password" type="password" placeholder="Enter Password" style="width:100%;padding:10px;margin:10px 0;border:1px solid #ccc;border-radius:6px;" required>
          <button style="width:100%;padding:10px;background:#0078d7;color:#fff;border:none;border-radius:6px;">Login</button>
        </form>
      </div>
    `);
  }
});

app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    res.redirect("/admin");
  } else {
    res.send("Incorrect password. <a href='/admin'>Try again</a>");
  }
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin"));
});

// Admin APIs
app.get("/admin/api/messages", (req, res) => {
  if (!req.session || !req.session.authenticated)
    return res.status(401).json({ error: "Unauthorized" });
  res.json(readSubmissions());
});

app.post("/admin/api/mark/:id", (req, res) => {
  if (!req.session || !req.session.authenticated)
    return res.status(401).json({ error: "Unauthorized" });
  const subs = readSubmissions();
  const id = req.params.id;
  const item = subs.find((x) => x.id === id);
  if (item) item.status = item.status === "processed" ? "new" : "processed";
  writeSubmissions(subs);
  res.json({ ok: true });
});

app.delete("/admin/api/delete/:id", (req, res) => {
  if (!req.session || !req.session.authenticated)
    return res.status(401).json({ error: "Unauthorized" });
  const id = req.params.id;
  const subs = readSubmissions().filter((x) => x.id !== id);
  writeSubmissions(subs);
  res.json({ ok: true });
});

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
