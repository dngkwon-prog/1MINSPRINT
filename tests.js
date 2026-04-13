const { spawn } = require("child_process");

const BASE = "http://localhost:3000";

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const server = spawn("node", ["server.js"], { stdio: "inherit" });
  try {
    await wait(1500);

    const unique = Date.now();
    const email = `test-${unique}@example.com`;

    const register = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123", displayName: "Tester" })
    });
    if (!register.ok) throw new Error("register failed");
    const registerData = await register.json();

    const me = await fetch(`${BASE}/api/me`, {
      headers: { Authorization: `Bearer ${registerData.token}` }
    });
    if (!me.ok) throw new Error("me failed");

    const sub = await fetch(`${BASE}/api/newsletter/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        country: "KR",
        gender: "Male",
        consent: true,
        source: "test",
        userId: registerData.user.id
      })
    });
    if (!sub.ok) throw new Error("newsletter failed");

    console.log("All API tests passed.");
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
