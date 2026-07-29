(() => {
  const app = window.heartBoard;
  const form = document.querySelector("#post-form");
  if (!app || !form) return;

  const labels = {
    approval: {
      approval: "承認制",
      instant: "すぐ参加",
      question: "質問あり",
    },
    size: {
      large: "101人〜",
      medium: "31〜100人",
      small: "〜30人",
    },
    time: {
      anytime: "いつでも",
      daytime: "昼",
      evening: "夕方",
      morning: "朝",
      night: "夜",
    },
  };

  const formText = (data, name, fallback = "") => {
    const value = data.get(name);
    return typeof value === "string" ? value : fallback;
  };

  const updateHeartRail = (quota) => {
    const track = document.querySelector(".preview-card .heart-track");
    const count = document.querySelector(".preview-card .heart-rail strong");
    if (!track || !count) return;
    [...track.children].forEach((heart, index) => {
      heart.classList.toggle("filled", index < Math.min(quota, 10));
    });
    count.textContent = String(quota);
  };

  const updatePreview = () => {
    const data = new FormData(form);
    const roomName = formText(data, "roomName").trim();
    const note = formText(data, "note").trim();
    const age = formText(data, "minAge", "20");
    const size = formText(data, "groupSize", "medium");
    const approval = formText(data, "approval", "approval");
    const time = formText(data, "activeTime", "evening");
    const quota = Number(data.get("quota") ?? 3);
    document.querySelector("[data-preview-name]").textContent = roomName || "夜のゆっくり交換室";
    document.querySelector("[data-preview-note]").textContent =
      note || "条件はカード内にすべて記載";
    document.querySelector("[data-preview-age]").textContent = `${age}+`;
    document.querySelector("[data-preview-size]").textContent = labels.size[size] ?? size;
    document.querySelector("[data-preview-approval]").textContent =
      labels.approval[approval] ?? approval;
    const beginner = document.querySelector("[data-preview-beginner]");
    beginner.hidden = data.get("beginnerWelcome") !== "on";
    const dial = document.querySelector(".preview-card .time-dial");
    dial.className = `time-dial ${time}`;
    dial.querySelector("b").textContent = labels.time[time] ?? time;
    updateHeartRail(quota);
  };

  form.addEventListener("input", updatePreview);
  form.addEventListener("change", updatePreview);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const message = document.querySelector("#form-message");
    const data = new FormData(form);
    button.disabled = true;
    button.textContent = "カードを確認中…";
    message.textContent = "";
    try {
      const result = await app.postJson("/api/listings", {
        activeTime: data.get("activeTime"),
        approval: data.get("approval"),
        beginnerWelcome: data.get("beginnerWelcome") === "on",
        confirmedAdult: data.get("confirmedAdult") === "on",
        confirmedManual: data.get("confirmedManual") === "on",
        groupSize: data.get("groupSize"),
        minAge: Number(data.get("minAge")),
        note: data.get("note"),
        openchatUrl: data.get("openchatUrl"),
        quota: Number(data.get("quota")),
        roomName: data.get("roomName"),
        sessionId: app.sessionId(),
        website: data.get("website"),
      });
      const hash = new URLSearchParams({ token: result.ownerToken });
      location.assign(`/manage/${result.listingId}#${hash.toString()}`);
    } catch (error) {
      const messages = {
        invalid_listing:
          "入力を確認してください。個人連絡先・外部URL・自動化の案内、通常のLINEグループURLは掲載できません。",
        rate_limited: "今日は3枚まで作成できます。時間をおいて試してください。",
      };
      message.textContent =
        messages[error.code] ?? "カードを貼れませんでした。もう一度お試しください。";
      button.disabled = false;
      button.textContent = "このカードを貼る";
    }
  });

  updatePreview();
})();
