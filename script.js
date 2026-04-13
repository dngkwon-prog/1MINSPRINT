const CONFIG = {
  API_BASE_URL: window.location.origin,
  FORMSPREE_ENDPOINT: "https://formspree.io/f/xnnvvdgy"
};

const yearEl = document.getElementById("year");
const newsletterForm = document.getElementById("newsletter-form");
const formStatus = document.getElementById("form-status");
const closeNewsletterBtn = document.getElementById("close-newsletter");
const newsletterWrap = document.querySelector(".newsletter-wrap");
const reopenBtn = document.getElementById("reopen-newsletter");
const simulateOverlayBtn = document.getElementById("simulate-overlay");
const stopOverlayBtn = document.getElementById("stop-overlay");
const overlay = document.getElementById("workout-overlay");
const countdownEl = document.getElementById("countdown");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const authStatus = document.getElementById("auth-status");
const userStatus = document.getElementById("user-status");
const tierSelect = document.getElementById("tier-select");
const updateTierBtn = document.getElementById("update-tier");

let intervalId = null;
let currentUser = null;
let authToken = localStorage.getItem("1ms-token") || "";

function apiUrl(path) {
  return `${CONFIG.API_BASE_URL}${path}`;
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  const response = await fetch(apiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

function setStatus(message, isError = false) {
  if (!formStatus) {
    return;
  }

  formStatus.textContent = message;
  formStatus.style.color = isError ? "#540f00" : "#082d16";
}

function setAuthStatus(message, isError = false) {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.style.color = isError ? "#7b0a0a" : "#103620";
}

function renderSession() {
  if (!userStatus) return;
  if (!currentUser) {
    userStatus.textContent = "Not signed in.";
    return;
  }
  userStatus.textContent = `${currentUser.displayName} (${currentUser.email}) · tier: ${currentUser.tier} · role: ${currentUser.role}`;
  if (tierSelect) {
    tierSelect.value = currentUser.tier;
  }
}

function saveLeadLocally(payload) {
  const key = "oneMinSprintLeads";
  const previous = JSON.parse(localStorage.getItem(key) || "[]");
  const normalizedEmail = payload.email.toLowerCase();

  const exists = previous.some((lead) => lead.email.toLowerCase() === normalizedEmail);
  if (exists) {
    return { ok: false, reason: "This email is already subscribed." };
  }

  previous.push(payload);
  localStorage.setItem(key, JSON.stringify(previous));
  return { ok: true };
}

async function submitToFormspree(data) {
  // Replace the endpoint with your own Formspree form URL.
  const endpoint = CONFIG.FORMSPREE_ENDPOINT;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        email: data.email,
        country: data.country,
        gender: data.gender,
        consent: data.consent,
        source: "1MINSPRINT landing page"
      })
    });

    if (!response.ok) {
      return { ok: false };
    }

    return { ok: true };
  } catch (_) {
    return { ok: false };
  }
}

if (newsletterForm) {
  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(newsletterForm);
    const payload = {
      email: String(formData.get("email") || "").trim(),
      country: String(formData.get("country") || "").trim(),
      gender: String(formData.get("gender") || "").trim(),
      consent: Boolean(formData.get("consent")),
      createdAt: new Date().toISOString()
    };

    if (!payload.email || !payload.country || !payload.gender || !payload.consent) {
      setStatus("Please complete all required fields.", true);
      return;
    }

    const localResult = saveLeadLocally(payload);
    if (!localResult.ok) {
      setStatus(localResult.reason, true);
      return;
    }

    setStatus("Submitting...");
    try {
      await request("/api/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          source: "1MINSPRINT landing page",
          userId: currentUser?.id || null
        })
      });
      setStatus("Subscribed. We will send updates soon.");
      newsletterForm.reset();
    } catch (error) {
      const fallback = await submitToFormspree(payload);
      if (fallback.ok) {
        setStatus("Subscribed via fallback channel.");
        newsletterForm.reset();
      } else {
        setStatus(error.message || "Subscription failed.", true);
      }
    }
  });
}

if (closeNewsletterBtn && newsletterWrap && reopenBtn) {
  closeNewsletterBtn.addEventListener("click", () => {
    newsletterWrap.style.display = "none";
    reopenBtn.style.display = "block";
  });

  reopenBtn.addEventListener("click", () => {
    newsletterWrap.style.display = "";
    reopenBtn.style.display = "none";
  });
}

function endOverlay() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  if (overlay) {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) {
    endOverlay();
  }
});

function startOverlay() {
  if (!overlay || !countdownEl) {
    return;
  }

  const phases = [
    { name: "SHOULDERS", duration: 20 },
    { name: "SQUATS", duration: 20 },
    { name: "BREATHING", duration: 20 }
  ];
  const phaseLabel = document.getElementById("phase-label");
  const dots = [
    document.getElementById("dot-1"),
    document.getElementById("dot-2"),
    document.getElementById("dot-3")
  ];
  let phaseIndex = 0;
  let remaining = phases[0].duration;

  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  countdownEl.textContent = String(remaining);

  function updatePhaseUI() {
    if (phaseLabel) {
      phaseLabel.textContent = phases[phaseIndex].name;
    }

    dots.forEach((dot, index) => {
      if (dot) {
        dot.classList.toggle("active", index === phaseIndex);
      }
    });
  }

  updatePhaseUI();

  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(() => {
    remaining -= 1;
    countdownEl.textContent = String(remaining);

    if (remaining <= 0) {
      phaseIndex += 1;

      if (phaseIndex >= phases.length) {
        endOverlay();
        return;
      }

      remaining = phases[phaseIndex].duration;
      countdownEl.textContent = String(remaining);
      updatePhaseUI();
    }
  }, 1000);
}

if (simulateOverlayBtn) {
  simulateOverlayBtn.addEventListener("click", startOverlay);
}

if (stopOverlayBtn) {
  stopOverlayBtn.addEventListener("click", endOverlay);
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const payload = {
      displayName: String(formData.get("displayName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || "")
    };
    if (!payload.displayName || !payload.email || payload.password.length < 8) {
      setAuthStatus("Check register fields. Password must be 8+ chars.", true);
      return;
    }

    try {
      const data = await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("1ms-token", authToken);
      renderSession();
      setAuthStatus("Registered and signed in.");
      registerForm.reset();
    } catch (error) {
      setAuthStatus(error.message, true);
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    try {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(formData.get("email") || "").trim(),
          password: String(formData.get("password") || "")
        })
      });
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem("1ms-token", authToken);
      renderSession();
      setAuthStatus("Signed in.");
      loginForm.reset();
    } catch (error) {
      setAuthStatus(error.message, true);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    authToken = "";
    currentUser = null;
    localStorage.removeItem("1ms-token");
    renderSession();
    setAuthStatus("Logged out.");
  });
}

if (updateTierBtn) {
  updateTierBtn.addEventListener("click", async () => {
    if (!currentUser) {
      setAuthStatus("Sign in first.", true);
      return;
    }
    try {
      const data = await request(`/api/users/${currentUser.id}/tier`, {
        method: "PATCH",
        body: JSON.stringify({ tier: tierSelect?.value || "starter" })
      });
      currentUser = data.user;
      renderSession();
      setAuthStatus("Tier updated.");
    } catch (error) {
      setAuthStatus(error.message, true);
    }
  });
}

async function restoreSession() {
  if (!authToken) {
    renderSession();
    return;
  }
  try {
    const data = await request("/api/me", { method: "GET" });
    currentUser = data.user;
    renderSession();
  } catch {
    authToken = "";
    localStorage.removeItem("1ms-token");
    renderSession();
  }
}

const darkToggle = document.getElementById("dark-toggle");
if (darkToggle) {
  const saved = localStorage.getItem("1ms-dark");
  if (saved === "true") {
    document.body.classList.add("dark");
  }

  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("1ms-dark", String(document.body.classList.contains("dark")));
  });
}

restoreSession();
