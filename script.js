const CONFIG = {
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

let intervalId = null;

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
    const apiResult = await submitToFormspree(payload);
    if (apiResult.ok) {
      setStatus("Subscribed. We will send updates soon.");
      newsletterForm.reset();
    } else {
      setStatus("Saved locally, but remote delivery failed. Check endpoint.", true);
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
