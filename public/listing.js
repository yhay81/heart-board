(() => {
  const app = window.heartBoard;
  const stage = document.querySelector("[data-listing-id]");
  if (!app || !stage) return;
  const listingId = stage.dataset.listingId;
  app.fillSessionFields();

  const goForm = document.querySelector("[data-go-form]");
  const confirmation = document.querySelector("[data-confirmation]");
  goForm?.addEventListener("submit", () => {
    confirmation?.classList.add("visible");
  });

  const toggle = document.querySelector("[data-report-toggle]");
  const reportForm = document.querySelector("[data-report-form]");
  toggle?.addEventListener("click", () => {
    reportForm.hidden = !reportForm.hidden;
    if (!reportForm.hidden) reportForm.querySelector("select")?.focus();
  });

  reportForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = reportForm.querySelector("button");
    const message = reportForm.querySelector("[data-report-message]");
    const reason = new FormData(reportForm).get("reason");
    button.disabled = true;
    try {
      await app.postJson(`/api/listings/${listingId}/report`, {
        reason,
        sessionId: app.sessionId(),
      });
      message.textContent = "報告を受け付けました。ありがとうございます。";
      toggle.hidden = true;
      reportForm.querySelector("label").hidden = true;
      button.hidden = true;
    } catch {
      message.textContent = "報告を受け付けられませんでした。時間をおいてお試しください。";
      button.disabled = false;
    }
  });
})();
