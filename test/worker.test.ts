import { beforeEach, describe, expect, it, vi } from "vitest";

import { app, type Bindings, type ListingRow, normalizeOpenChatUrl } from "../src/worker";

const listingId = "a".repeat(32);
const sessionId = "7c0dbe70-8c47-4fc0-aa62-52427133c612";
const ownerToken = "1".repeat(64);
const openchatUrl = `https://line.me/ti/g2/${"Abc_123-xYz".repeat(3)}`;

type State = {
  dailyCount?: number;
  listing?: ListingRow | null;
  listings?: ListingRow[];
  previousDay?: boolean;
  reportCount?: number;
};

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const defaultListing = async (status: "active" | "closed" | "hidden" = "active") => ({
  active_time: "evening",
  approval: "approval",
  beginner_welcome: 1,
  created_at: Math.floor(Date.now() / 1000),
  expires_at: Math.floor(Date.now() / 1000) + 86_400,
  group_size: "medium",
  id: listingId,
  min_age: 20,
  note: "無理のないペースで続けています",
  openchat_url: openchatUrl,
  owner_token_hash: await hash(ownerToken),
  quota: 3,
  room_name: "夜のゆっくり交換室",
  status,
  updated_at: Math.floor(Date.now() / 1000),
});

const makeBindings = (state: State = {}) => {
  const calls: Array<{ arguments: unknown[]; sql: string }> = [];
  const batch = vi.fn(() => Promise.resolve([]));
  const prepare = vi.fn((sql: string) => {
    const call = { arguments: [] as unknown[], sql };
    calls.push(call);
    const statement = {
      all: vi.fn(async () => {
        if (sql.includes("FROM listings")) {
          return { results: state.listings ?? [] };
        }
        return { results: [] };
      }),
      bind: vi.fn((...arguments_: unknown[]) => {
        call.arguments = arguments_;
        return statement;
      }),
      first: vi.fn(async () => {
        if (sql.includes("COUNT(*) AS count FROM listings")) {
          return { count: state.dailyCount ?? 0 };
        }
        if (sql.includes("SELECT 1 AS found FROM listings")) {
          return state.previousDay ? { found: 1 } : null;
        }
        if (sql.includes("COUNT(*) AS count FROM reports")) {
          return { count: state.reportCount ?? 1 };
        }
        if (sql.includes("FROM listings")) {
          return state.listing ?? null;
        }
        return null;
      }),
      run: vi.fn(() => Promise.resolve({ success: true })),
    };
    return statement;
  });
  return {
    batch,
    bindings: {
      ASSETS: {
        fetch: () => Promise.resolve(new Response("not used")),
      },
      DB: {
        batch,
        prepare,
      },
    } as unknown as Bindings,
    calls,
  };
};

const jsonHeaders = {
  "content-type": "application/json",
  "sec-fetch-site": "same-origin",
};

const validPayload = {
  activeTime: "evening",
  approval: "approval",
  beginnerWelcome: true,
  confirmedAdult: true,
  confirmedManual: true,
  groupSize: "medium",
  minAge: 20,
  note: "無理のないペースで続けています",
  openchatUrl: `${openchatUrl}?utm_source=sample#ignored`,
  quota: 3,
  roomName: "夜のゆっくり交換室",
  sessionId,
  website: "",
};

describe("Heart Board worker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a compact visual board without experiment copy", async () => {
    const listing = await defaultListing();
    const response = await app.request(
      "/",
      undefined,
      makeBindings({ listings: [listing] }).bindings,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(html).toContain('lang="ja"');
    expect(html).toContain('itemtype="https://schema.org/WebApplication"');
    expect(html).toContain('class="cork-board"');
    expect(html).toContain('class="heart-rail"');
    expect(html).toContain("夜のゆっくり交換室");
    expect(html).not.toContain("data-template-surface");
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain("PUBLIC VALIDATION");
    expect(html).not.toContain("成功条件");
  });

  it("shows an honest empty board instead of invented listings", async () => {
    const response = await app.request("/", undefined, makeBindings().bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("条件に合うカードはまだありません");
    expect(html).toContain("0枚");
    expect(html).not.toContain("夜のゆっくり交換室");
  });

  it("renders public listing details without exposing the invite URL", async () => {
    const listing = await defaultListing();
    const response = await app.request(
      `/rooms/${listingId}`,
      undefined,
      makeBindings({ listing }).bindings,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(html).toContain("夜のゆっくり交換室");
    expect(html).toContain(`action="/go/${listingId}"`);
    expect(html).not.toContain(openchatUrl);
  });

  it("accepts only a normalized OpenChat invitation and creates an owner secret", async () => {
    const { batch, bindings, calls } = makeBindings();
    const response = await app.request(
      "/api/listings",
      { body: JSON.stringify(validPayload), headers: jsonHeaders, method: "POST" },
      bindings,
    );
    const body = await response.json<{ listingId: string; ownerToken: string }>();

    expect(response.status).toBe(201);
    expect(body.listingId).toMatch(/^[0-9a-f]{32}$/);
    expect(body.ownerToken).toMatch(/^[0-9a-f]{64}$/);
    expect(batch).toHaveBeenCalledTimes(2);
    const insert = calls.find((call) => call.sql.includes("INSERT INTO listings"));
    expect(insert?.arguments).toContain(openchatUrl);
    expect(JSON.stringify(insert?.arguments)).not.toContain("utm_source");
    expect(calls.some((call) => call.sql.includes("'listing_created'"))).toBe(true);
  });

  it("rejects personal groups, contact details, automation, bots, and cross-site creation", async () => {
    const invalidPayloads = [
      { ...validPayload, openchatUrl: "https://line.me/ti/g/personal-group" },
      { ...validPayload, note: "LINE ID: example123" },
      { ...validPayload, note: "自動送信ツール必須です" },
      { ...validPayload, roomName: "高校生も歓迎" },
      { ...validPayload, website: "filled-by-bot" },
    ];
    for (const payload of invalidPayloads) {
      const response = await app.request(
        "/api/listings",
        { body: JSON.stringify(payload), headers: jsonHeaders, method: "POST" },
        makeBindings().bindings,
      );
      expect(response.status).toBe(400);
    }
    const crossSite = await app.request(
      "/api/listings",
      {
        body: JSON.stringify(validPayload),
        headers: { ...jsonHeaders, "sec-fetch-site": "cross-site" },
        method: "POST",
      },
      makeBindings().bindings,
    );
    expect(crossSite.status).toBe(403);
  });

  it("recognizes only strict line.me g2 invitations", () => {
    expect(normalizeOpenChatUrl(`${openchatUrl}/?utm_source=test#fragment`)).toBe(openchatUrl);
    expect(normalizeOpenChatUrl("http://line.me/ti/g2/Abcdefghijk")).toBe("");
    expect(normalizeOpenChatUrl("https://evil.example/ti/g2/Abcdefghijk")).toBe("");
    expect(normalizeOpenChatUrl("https://lin.ee/Abcdefghijk")).toBe("");
    expect(normalizeOpenChatUrl("https://line.me/ti/g/Abcdefghijk")).toBe("");
  });

  it("limits one browser to three new cards per day", async () => {
    const response = await app.request(
      "/api/listings",
      { body: JSON.stringify(validPayload), headers: jsonHeaders, method: "POST" },
      makeBindings({ dailyCount: 3 }).bindings,
    );

    expect(response.status).toBe(429);
  });

  it("returns management data only with the owner secret", async () => {
    const listing = await defaultListing();
    const valid = await app.request(
      `/api/listings/${listingId}/manage`,
      { headers: { authorization: `Bearer ${ownerToken}` } },
      makeBindings({ listing }).bindings,
    );
    const invalid = await app.request(
      `/api/listings/${listingId}/manage`,
      { headers: { authorization: `Bearer ${"2".repeat(64)}` } },
      makeBindings({ listing }).bindings,
    );
    const body = await valid.json<Record<string, unknown>>();

    expect(valid.status).toBe(200);
    expect(body.openchatUrl).toBe(openchatUrl);
    expect(body).not.toHaveProperty("owner_token_hash");
    expect(invalid.status).toBe(403);
  });

  it("tracks an anonymous outbound and redirects without a referrer", async () => {
    const listing = await defaultListing();
    const { bindings, calls } = makeBindings({ listing });
    const response = await app.request(
      `/go/${listingId}`,
      {
        body: new URLSearchParams({ sessionId }).toString(),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
      },
      bindings,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(openchatUrl);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(calls.some((call) => call.sql.includes("'openchat_opened'"))).toBe(true);
  });

  it("hides the invitation after three distinct reports", async () => {
    const listing = await defaultListing();
    const { bindings, calls } = makeBindings({ listing, reportCount: 3 });
    const response = await app.request(
      `/api/listings/${listingId}/report`,
      {
        body: JSON.stringify({ reason: "automation", sessionId }),
        headers: jsonHeaders,
        method: "POST",
      },
      bindings,
    );

    expect(response.status).toBe(200);
    expect(
      calls.some(
        (call) => call.sql.includes("status = 'hidden'") && call.sql.includes("openchat_url = ''"),
      ),
    ).toBe(true);
  });

  it("documents actual data, deletion, and retention boundaries", async () => {
    const response = await app.request("/privacy", undefined, makeBindings().bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("オープンチャット招待URL");
    expect(html).toContain("IPアドレス、User-Agent、氏名は分析データに保存しません");
    expect(html).toContain("14日");
    expect(html).toContain("120日以内");
  });

  it("serves HTML for missing pages and JSON for missing API routes", async () => {
    const page = await app.request("/missing", undefined, makeBindings().bindings);
    const api = await app.request("/api/missing", undefined, makeBindings().bindings);
    const pageHtml = await page.text();
    const apiBody = await api.json<{ error: string; requestId: string }>();

    expect(page.status).toBe(404);
    expect(pageHtml).toContain("このカードは見つかりません");
    expect(pageHtml).toContain('content="noindex,nofollow,noarchive"');
    expect(api.status).toBe(404);
    expect(apiBody.error).toBe("not_found");
    expect(apiBody.requestId).toBeTruthy();
  });

  it("exposes a non-sensitive health response", async () => {
    const response = await app.request("/healthz", undefined, makeBindings().bindings);
    const body = await response.json<{ healthy: boolean; service: string }>();

    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ healthy: true, service: "heart-board" }));
  });
});
