import { Hono } from "hono";
import type { Context } from "hono";
import { requestId } from "hono/request-id";

import { securityHeaders } from "./middleware/security";
import {
  GuidePage,
  HomePage,
  ListingPage,
  ManagePage,
  MissingPage,
  PostPage,
  PrivacyPage,
} from "./ui/pages";
import type { ListingView } from "./ui/pages";

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
};

export type ListingStatus = "active" | "closed" | "hidden";

export type ListingRow = {
  active_time: string;
  approval: string;
  beginner_welcome: number;
  created_at: number;
  expires_at: number;
  group_size: string;
  id: string;
  min_age: number;
  note: string;
  openchat_url: string;
  owner_token_hash: string;
  quota: number;
  room_name: string;
  status: ListingStatus;
  updated_at: number;
};

type AppContext = Context<{ Bindings: Bindings }>;

class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: 400 | 403 | 404 | 409 | 413 | 415 | 429,
  ) {
    super(code);
  }
}

const app = new Hono<{ Bindings: Bindings }>();
const idPattern = /^[0-9a-f]{32}$/i;
const secretPattern = /^[0-9a-f]{64}$/i;
const sessionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const activeTimes = new Set(["anytime", "morning", "daytime", "evening", "night"]);
const approvals = new Set(["instant", "approval", "question"]);
const groupSizes = new Set(["small", "medium", "large"]);
const minimumAges = new Set([18, 20, 25, 30]);
const reportReasons = new Set(["dead", "minor", "automation", "contact", "spam", "unsafe"]);
const telemetryNames = new Set(["visited", "filters_used", "listing_created", "returned"]);

const unsafeTextPattern =
  /(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|jp)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?81[- ]?|0)\d{1,4}[- ]?\d{1,4}[- ]?\d{3,4}|(?:line|ライン)\s*(?:id|ｉｄ|アイディー)|(?:qr|ｑｒ)\s*(?:コード)?|@[a-z0-9_]{3,}|bot|ボット|自動(?:送信|化)|オート送信|チート|ツール必須|複数端末|親型|子型|中学生|高校生|未成年|学生限定|1[0-7]\s*歳)/iu;

const randomHex = (byteLength: number) => {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sameHash = (left: string, right: string) => {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
};

const cleanup = (db: D1Database) =>
  db.batch([
    db.prepare(
      `UPDATE listings
       SET status = 'closed', openchat_url = '', updated_at = unixepoch()
       WHERE expires_at <= unixepoch() AND status = 'active'`,
    ),
    db.prepare("DELETE FROM listings WHERE expires_at < unixepoch() - (30 * 86400)"),
    db.prepare("DELETE FROM product_events WHERE created_at < unixepoch() - (120 * 86400)"),
  ]);

const enforceSameOrigin = (c: AppContext) => {
  const fetchSite = c.req.header("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    throw new ApiError("cross_site_request", 403);
  }
  const origin = c.req.header("origin");
  if (origin && origin !== new URL(c.req.url).origin) {
    throw new ApiError("cross_site_request", 403);
  }
};

const parseJson = async (c: AppContext, maximumBytes: number) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError("unsupported_media_type", 415);
  }
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (contentLength > maximumBytes) {
    throw new ApiError("payload_too_large", 413);
  }
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
    throw new ApiError("payload_too_large", 413);
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new ApiError("invalid_json", 400);
  }
};

const parseOptionalSession = async (c: AppContext) => {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    throw new ApiError("unsupported_media_type", 415);
  }
  const rawBody = await c.req.text();
  if (new TextEncoder().encode(rawBody).byteLength > 1024) {
    throw new ApiError("payload_too_large", 413);
  }
  const sessionId = new URLSearchParams(rawBody).get("sessionId") ?? "";
  return sessionPattern.test(sessionId) ? sessionId : "";
};

const cleanText = (value: unknown, maximumLength: number) => {
  if (typeof value !== "string") {
    return "";
  }
  const withoutControls = Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("");
  return Array.from(withoutControls.replaceAll(/\s+/g, " ").trim())
    .slice(0, maximumLength)
    .join("");
};

const isSafeVisibleText = (value: string) => !unsafeTextPattern.test(value);

export const normalizeOpenChatUrl = (value: unknown) => {
  if (typeof value !== "string" || value.length > 500) {
    return "";
  }
  try {
    const parsed = new URL(value.trim());
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "line.me" ||
      !/^\/ti\/g2\/[A-Za-z0-9_-]{10,240}\/?$/.test(parsed.pathname)
    ) {
      return "";
    }
    return `https://line.me${parsed.pathname.replace(/\/$/, "")}`;
  } catch {
    return "";
  }
};

const getListing = (db: D1Database, listingId: string, includeClosed = false) =>
  db
    .prepare(
      `SELECT id, owner_token_hash, openchat_url, room_name, quota, active_time,
        min_age, group_size, approval, beginner_welcome, note, status,
        created_at, updated_at, expires_at
       FROM listings
       WHERE id = ? AND expires_at > unixepoch()
         ${includeClosed ? "AND status != 'hidden'" : "AND status = 'active'"}`,
    )
    .bind(listingId)
    .first<ListingRow>();

const publicListing = (listing: ListingRow): ListingView => ({
  activeTime: listing.active_time,
  approval: listing.approval,
  beginnerWelcome: Boolean(listing.beginner_welcome),
  createdAt: new Date(listing.created_at * 1000).toISOString(),
  expiresAt: new Date(listing.expires_at * 1000).toISOString(),
  groupSize: listing.group_size,
  id: listing.id,
  minAge: listing.min_age,
  note: listing.note,
  quota: listing.quota,
  roomName: listing.room_name,
  status: listing.status,
});

const bearerToken = (c: AppContext) => {
  const authorization = c.req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!secretPattern.test(token)) {
    throw new ApiError("access_denied", 403);
  }
  return token;
};

const requireOwner = async (c: AppContext, listingId: string) => {
  const token = bearerToken(c);
  const listing = await getListing(c.env.DB, listingId, true);
  if (!listing || !sameHash(await sha256(token), listing.owner_token_hash)) {
    throw new ApiError("access_denied", 403);
  }
  return listing;
};

const readListings = async (c: AppContext) => {
  const time = activeTimes.has(c.req.query("time") ?? "") ? (c.req.query("time") ?? "") : "";
  const ageValue = Number(c.req.query("age") ?? 0);
  const age = minimumAges.has(ageValue) ? ageValue : 0;
  const quotaValue = Number(c.req.query("quota") ?? 0);
  const quota = [3, 5, 10].includes(quotaValue) ? quotaValue : 0;
  const beginner = c.req.query("beginner") === "1";
  const clauses = ["status = 'active'", "expires_at > unixepoch()"];
  const values: Array<number | string> = [];
  if (time) {
    clauses.push("(active_time = ? OR active_time = 'anytime')");
    values.push(time);
  }
  if (age) {
    clauses.push("min_age <= ?");
    values.push(age);
  }
  if (quota) {
    clauses.push("quota <= ?");
    values.push(quota);
  }
  if (beginner) {
    clauses.push("beginner_welcome = 1");
  }
  const statement = c.env.DB.prepare(
    `SELECT id, owner_token_hash, openchat_url, room_name, quota, active_time,
      min_age, group_size, approval, beginner_welcome, note, status,
      created_at, updated_at, expires_at
     FROM listings
     WHERE ${clauses.join(" AND ")}
     ORDER BY updated_at DESC, id DESC
     LIMIT 48`,
  );
  const result = await statement.bind(...values).all<ListingRow>();
  return {
    filters: { age, beginner, quota, time },
    listings: result.results.map(publicListing),
  };
};

app.use("*", requestId());
app.use("*", securityHeaders);

app.get("/", async (c) => {
  const { filters, listings } = await readListings(c);
  c.header("Cache-Control", "public, max-age=30");
  return c.html(<HomePage filters={filters} listings={listings} />);
});
app.get("/post", (c) => c.html(<PostPage />));
app.get("/guide", (c) => c.html(<GuidePage />));
app.get("/privacy", (c) => c.html(<PrivacyPage />));

app.get("/rooms/:listingId", async (c) => {
  const listingId = c.req.param("listingId");
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  if (!idPattern.test(listingId)) {
    return c.html(<MissingPage />, 404);
  }
  const listing = await getListing(c.env.DB, listingId);
  if (!listing) {
    return c.html(<MissingPage />, 404);
  }
  return c.html(
    <ListingPage joined={c.req.query("joined") === "1"} listing={publicListing(listing)} />,
  );
});

app.get("/manage/:listingId", (c) => {
  const listingId = c.req.param("listingId");
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  return idPattern.test(listingId)
    ? c.html(<ManagePage listingId={listingId} />)
    : c.html(<MissingPage />, 404);
});

app.post("/api/listings", async (c) => {
  enforceSameOrigin(c);
  const payload = await parseJson(c, 4096);
  if (!payload || typeof payload !== "object") {
    throw new ApiError("invalid_listing", 400);
  }
  const source = payload as Record<string, unknown>;
  const roomName = cleanText(source.roomName, 30);
  const note = cleanText(source.note, 60);
  const openchatUrl = normalizeOpenChatUrl(source.openchatUrl);
  const quota = Number(source.quota);
  const minAge = Number(source.minAge);
  const activeTime = typeof source.activeTime === "string" ? source.activeTime : "";
  const groupSize = typeof source.groupSize === "string" ? source.groupSize : "";
  const approval = typeof source.approval === "string" ? source.approval : "";
  const beginnerWelcome = source.beginnerWelcome === true;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const confirmedAdult = source.confirmedAdult === true;
  const confirmedManual = source.confirmedManual === true;
  const honeypot = cleanText(source.website, 100);
  if (
    !roomName ||
    !openchatUrl ||
    !Number.isInteger(quota) ||
    quota < 1 ||
    quota > 20 ||
    !minimumAges.has(minAge) ||
    !activeTimes.has(activeTime) ||
    !groupSizes.has(groupSize) ||
    !approvals.has(approval) ||
    !sessionPattern.test(sessionId) ||
    !confirmedAdult ||
    !confirmedManual ||
    honeypot ||
    !isSafeVisibleText(roomName) ||
    !isSafeVisibleText(note)
  ) {
    throw new ApiError("invalid_listing", 400);
  }

  await cleanup(c.env.DB);
  const dailyCount = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM listings WHERE creator_session_id = ? AND created_at > unixepoch() - 86400",
  )
    .bind(sessionId)
    .first<{ count: number }>();
  if (Number(dailyCount?.count ?? 0) >= 3) {
    throw new ApiError("rate_limited", 429);
  }
  const previousDay = await c.env.DB.prepare(
    `SELECT 1 AS found FROM listings
       WHERE creator_session_id = ? AND date(created_at, 'unixepoch') < date('now')
       LIMIT 1`,
  )
    .bind(sessionId)
    .first<{ found: number }>();

  const listingId = randomHex(16);
  const ownerToken = randomHex(32);
  const expiresAt = Math.floor(Date.now() / 1000) + 14 * 86_400;
  const today = new Date().toISOString().slice(0, 10);
  const statements = [
    c.env.DB.prepare(
      `INSERT INTO listings
        (id, owner_token_hash, creator_session_id, openchat_url, room_name, quota,
         active_time, min_age, group_size, approval, beginner_welcome, note, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      listingId,
      await sha256(ownerToken),
      sessionId,
      openchatUrl,
      roomName,
      quota,
      activeTime,
      minAge,
      groupSize,
      approval,
      beginnerWelcome ? 1 : 0,
      note,
      expiresAt,
    ),
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO product_events
        (session_id, name, context, occurred_on)
       VALUES (?, 'listing_created', ?, ?)`,
    ).bind(sessionId, listingId, today),
  ];
  if (previousDay) {
    statements.push(
      c.env.DB.prepare(
        `INSERT OR IGNORE INTO product_events
          (session_id, name, context, occurred_on)
         VALUES (?, 'returned', 'owner', ?)`,
      ).bind(sessionId, today),
    );
  }
  await c.env.DB.batch(statements);
  c.header("Cache-Control", "no-store");
  return c.json({ listingId, ownerToken }, 201);
});

app.get("/api/listings/:listingId/manage", async (c) => {
  const listingId = c.req.param("listingId");
  if (!idPattern.test(listingId)) {
    throw new ApiError("not_found", 404);
  }
  const listing = await requireOwner(c, listingId);
  c.header("Cache-Control", "no-store");
  return c.json({ ...publicListing(listing), openchatUrl: listing.openchat_url });
});

app.patch("/api/listings/:listingId/status", async (c) => {
  enforceSameOrigin(c);
  const listingId = c.req.param("listingId");
  if (!idPattern.test(listingId)) {
    throw new ApiError("not_found", 404);
  }
  const listing = await requireOwner(c, listingId);
  const payload = await parseJson(c, 1024);
  const status =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).status : "";
  if (status !== "active" && status !== "closed") {
    throw new ApiError("invalid_status", 400);
  }
  if (status === "active" && !listing.openchat_url) {
    throw new ApiError("listing_expired", 409);
  }
  await c.env.DB.prepare("UPDATE listings SET status = ?, updated_at = unixepoch() WHERE id = ?")
    .bind(status, listingId)
    .run();
  return c.json({ status });
});

app.delete("/api/listings/:listingId", async (c) => {
  enforceSameOrigin(c);
  const listingId = c.req.param("listingId");
  if (!idPattern.test(listingId)) {
    throw new ApiError("not_found", 404);
  }
  await requireOwner(c, listingId);
  await c.env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(listingId).run();
  return c.json({ deleted: true });
});

app.post("/api/listings/:listingId/report", async (c) => {
  enforceSameOrigin(c);
  const listingId = c.req.param("listingId");
  if (!idPattern.test(listingId)) {
    throw new ApiError("not_found", 404);
  }
  const listing = await getListing(c.env.DB, listingId);
  if (!listing) {
    throw new ApiError("not_found", 404);
  }
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") {
    throw new ApiError("invalid_report", 400);
  }
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const reason = typeof source.reason === "string" ? source.reason : "";
  if (!sessionPattern.test(sessionId) || !reportReasons.has(reason)) {
    throw new ApiError("invalid_report", 400);
  }
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO reports (listing_id, reporter_session_id, reason) VALUES (?, ?, ?)",
  )
    .bind(listingId, sessionId, reason)
    .run();
  const result = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM reports WHERE listing_id = ?",
  )
    .bind(listingId)
    .first<{ count: number }>();
  if (Number(result?.count ?? 0) >= 3) {
    await c.env.DB.prepare(
      "UPDATE listings SET status = 'hidden', openchat_url = '', updated_at = unixepoch() WHERE id = ?",
    )
      .bind(listingId)
      .run();
  }
  return c.json({ reported: true });
});

app.post("/go/:listingId", async (c) => {
  enforceSameOrigin(c);
  const listingId = c.req.param("listingId");
  if (!idPattern.test(listingId)) {
    throw new ApiError("not_found", 404);
  }
  const listing = await getListing(c.env.DB, listingId);
  if (!listing?.openchat_url) {
    throw new ApiError("not_found", 404);
  }
  const sessionId = await parseOptionalSession(c);
  if (sessionId) {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO product_events
          (session_id, name, context, occurred_on)
         VALUES (?, 'openchat_opened', ?, ?)`,
    )
      .bind(sessionId, listingId, new Date().toISOString().slice(0, 10))
      .run();
  }
  c.header("Cache-Control", "no-store");
  c.header("Referrer-Policy", "no-referrer");
  return c.redirect(listing.openchat_url, 303);
});

app.post("/confirm/:listingId", async (c) => {
  enforceSameOrigin(c);
  const listingId = c.req.param("listingId");
  if (!idPattern.test(listingId) || !(await getListing(c.env.DB, listingId))) {
    throw new ApiError("not_found", 404);
  }
  const sessionId = await parseOptionalSession(c);
  if (sessionId) {
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO product_events
          (session_id, name, context, occurred_on)
         VALUES (?, 'join_confirmed', ?, ?)`,
    )
      .bind(sessionId, listingId, new Date().toISOString().slice(0, 10))
      .run();
  }
  return c.redirect(`/rooms/${listingId}?joined=1`, 303);
});

app.post("/api/telemetry", async (c) => {
  enforceSameOrigin(c);
  const payload = await parseJson(c, 1024);
  if (!payload || typeof payload !== "object") {
    throw new ApiError("invalid_event", 400);
  }
  const source = payload as Record<string, unknown>;
  const sessionId = typeof source.sessionId === "string" ? source.sessionId : "";
  const name = typeof source.name === "string" ? source.name : "";
  const context = source.context === "filtered" ? "filtered" : "home";
  if (!sessionPattern.test(sessionId) || !telemetryNames.has(name)) {
    throw new ApiError("invalid_event", 400);
  }
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO product_events
        (session_id, name, context, occurred_on) VALUES (?, ?, ?, ?)`,
  )
    .bind(sessionId, name, context, new Date().toISOString().slice(0, 10))
    .run();
  return c.body(null, 204);
});

app.get("/healthz", (c) =>
  c.json({
    healthy: true,
    service: "heart-board",
    time: new Date().toISOString(),
  }),
);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "not_found", requestId: c.get("requestId") }, 404);
  }
  c.header("X-Robots-Tag", "noindex, nofollow, noarchive");
  return c.html(<MissingPage />, 404);
});

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json({ error: error.code, requestId: c.get("requestId") }, error.status);
  }
  console.error(
    JSON.stringify({
      event: "request_failed",
      message: error.message,
      requestId: c.get("requestId"),
    }),
  );
  return c.json({ error: "internal_error", requestId: c.get("requestId") }, 500);
});

export { app };

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext) {
    context.waitUntil(cleanup(env.DB));
  },
} satisfies ExportedHandler<Bindings>;
