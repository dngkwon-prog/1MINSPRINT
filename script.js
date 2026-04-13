const yearEl = document.getElementById("year");
const ctaBtn = document.getElementById("cta-btn");

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

if (ctaBtn) {
  ctaBtn.addEventListener("click", () => {
    window.alert("반가워요! 원하는 내용으로 이 메시지를 바꿔보세요.");
  });
}
