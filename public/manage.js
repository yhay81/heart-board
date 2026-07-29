(() => {
  const app = window.heartBoard;
  const stage = document.querySelector("[data-listing-id]");
  const panel = document.querySelector("[data-manage-panel]");
  if (!app || !stage || !panel) return;
  const listingId = stage.dataset.listingId;
  const token = new URLSearchParams(location.hash.slice(1)).get("token") ?? "";

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const request = async (path, options = {}) => {
    const response = await fetch(path, {
      ...options,
      headers: {
        authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    if (!response.ok) throw new Error("request_failed");
    return response.status === 204 ? null : response.json();
  };

  const render = (listing) => {
    panel.replaceChildren();
    const card = element("article", "owner-card");
    const state = element(
      "span",
      `owner-status ${listing.status}`,
      listing.status === "active" ? "掲載中" : "終了",
    );
    const title = element("h2", "", listing.roomName);
    const facts = element("div", "owner-facts");
    [
      `1日 ${listing.quota}個`,
      `${listing.minAge}歳以上`,
      listing.beginnerWelcome ? "はじめて歓迎" : "通常募集",
    ].forEach((text) => facts.append(element("span", "", text)));
    const expiry = element(
      "p",
      "owner-expiry",
      `掲載期限 ${new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(
        new Date(listing.expiresAt),
      )}`,
    );
    card.append(state, title, facts, expiry);

    const actions = element("div", "owner-actions");
    const publicLink = element("a", "button coral", "公開カードを見る");
    publicLink.href = `/rooms/${listingId}`;
    const toggle = element(
      "button",
      "button soft",
      listing.status === "active" ? "募集を終了する" : "募集を再開する",
    );
    toggle.type = "button";
    const remove = element("button", "delete-button", "カードを削除");
    remove.type = "button";
    const message = element("p", "form-message");
    actions.append(publicLink, toggle, remove, message);
    panel.append(card, actions);

    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      const next = listing.status === "active" ? "closed" : "active";
      try {
        await request(`/api/listings/${listingId}/status`, {
          body: JSON.stringify({ status: next }),
          headers: { "content-type": "application/json" },
          method: "PATCH",
        });
        listing.status = next;
        render(listing);
      } catch {
        message.textContent = "状態を変更できませんでした。掲載期限をご確認ください。";
        toggle.disabled = false;
      }
    });

    remove.addEventListener("click", async () => {
      if (!confirm("この募集カードを完全に削除しますか？")) return;
      remove.disabled = true;
      try {
        await request(`/api/listings/${listingId}`, { method: "DELETE" });
        panel.replaceChildren(
          element("p", "manage-complete", "カードを削除しました。募集ボードには表示されません。"),
        );
        history.replaceState(null, "", `/manage/${listingId}`);
      } catch {
        message.textContent = "削除できませんでした。もう一度お試しください。";
        remove.disabled = false;
      }
    });
  };

  if (!/^[0-9a-f]{64}$/i.test(token)) {
    panel.replaceChildren(
      element(
        "p",
        "manage-error",
        "管理鍵が見つかりません。作成時に保存した管理URLを開いてください。",
      ),
    );
    return;
  }

  request(`/api/listings/${listingId}/manage`)
    .then(render)
    .catch(() => {
      panel.replaceChildren(
        element(
          "p",
          "manage-error",
          "カードを確認できませんでした。管理URLが正しいか、掲載期限内かをご確認ください。",
        ),
      );
    });
})();
