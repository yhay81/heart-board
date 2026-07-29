(() => {
  const storageKey = "heart-board-session";

  const sessionId = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (
        stored &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)
      ) {
        return stored;
      }
      const created = crypto.randomUUID();
      localStorage.setItem(storageKey, created);
      return created;
    } catch {
      return crypto.randomUUID();
    }
  };

  const postJson = async (url, body, options = {}) => {
    const response = await fetch(url, {
      ...options,
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...options.headers,
      },
      method: options.method ?? "POST",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({ error: "request_failed" }));
      const error = new Error(payload.error ?? "request_failed");
      error.code = payload.error ?? "request_failed";
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  };

  const fillSessionFields = () => {
    const current = sessionId();
    document.querySelectorAll(".session-field").forEach((field) => {
      field.value = current;
    });
    return current;
  };

  window.heartBoard = {
    fillSessionFields,
    postJson,
    sessionId,
  };

  fillSessionFields();
})();
