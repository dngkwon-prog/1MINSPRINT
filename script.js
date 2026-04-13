const yearEl = document.getElementById("year");
const newsletterForm = document.getElementById("newsletter-form");
const formStatus = document.getElementById("form-status");
const closeNewsletterBtn = document.getElementById("close-newsletter");
const newsletterWrap = document.querySelector(".newsletter-wrap");
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
  const endpoint = "https://formspree.io/f/xnnvvdgy";

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

if (closeNewsletterBtn && newsletterWrap) {
  closeNewsletterBtn.addEventListener("click", () => {
    newsletterWrap.style.display = "none";
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

function startOverlay(duration = 60) {
  if (!overlay || !countdownEl) {
    return;
  }

  let remaining = duration;
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");
  countdownEl.textContent = String(remaining);

  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(() => {
    remaining -= 1;
    countdownEl.textContent = String(remaining);

    if (remaining <= 0) {
      endOverlay();
    }
  }, 1000);
}

if (simulateOverlayBtn) {
  simulateOverlayBtn.addEventListener("click", () => startOverlay(60));
}

if (stopOverlayBtn) {
  stopOverlayBtn.addEventListener("click", endOverlay);
}
