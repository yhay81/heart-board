(() => {
  const app = window.heartBoard;
  if (!app) return;

  const filtered = new URLSearchParams(location.search).toString().length > 0;
  app
    .postJson("/api/telemetry", {
      context: "home",
      name: "visited",
      sessionId: app.sessionId(),
    })
    .catch(() => {});
  if (filtered) {
    app
      .postJson("/api/telemetry", {
        context: "filtered",
        name: "filters_used",
        sessionId: app.sessionId(),
      })
      .catch(() => {});
  }
})();
