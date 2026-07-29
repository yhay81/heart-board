(() => {
  const app = window.heartBoard;
  if (!app) return;

  const filtered = new URLSearchParams(location.search).toString().length > 0;
  app
    .postJson("/api/telemetry", {
      context: filtered ? "filtered" : "home",
      name: filtered ? "filters_used" : "visited",
      sessionId: app.sessionId(),
    })
    .catch(() => {});
})();
