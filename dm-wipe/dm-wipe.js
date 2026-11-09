/*!
 * DM Wipe v1.0.0 — delete YOUR OWN messages in ONE Discord DM, any age.
 * https://github.com/1elevenop/Discord-Tool-Hub/tree/main/dm-wipe  ·  MIT License
 *
 * Run in the browser console on discord.com (not the desktop app).
 * - Starts in DRY RUN mode: counts only, deletes nothing.
 * - Requests go ONLY to discord.com. If the fallback is used, your auth header is
 *   kept in page memory only: never printed, stored, or sent anywhere else.
 * - Discord only lets you delete your own messages. The other person's stay.
 * - Automating a user account is against Discord's Terms of Service. Use at your own risk.
 */
(async () => {
  "use strict";

  /* ── settings ───────────────────────────────────────────── */
  const DRY_RUN = true;            // true = count only. Change to false to delete.
  const CHANNEL_ID = "";           // empty = use the DM that is open in this tab
  const DELAY_MS = [1100, 1800];   // random wait between deletes (keep it slow)
  const PAGE_DELAY_MS = 600;       // wait between pages of 100 messages

  /* ── helpers ────────────────────────────────────────────── */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
  const log = (...a) => console.log("%c[DM-Wipe]", "color:#5865F2;font-weight:bold", ...a);
  window.__dmWipeStop = false;     // type  window.__dmWipeStop = true  to stop
  if (location.hostname !== "discord.com" && !location.hostname.endsWith(".discord.com")) {
    return log("Run this on discord.com.");
  }

  /* ── way 1: Discord's own request module ────────────────── */
  function findRestModule() {
    if (typeof webpackChunkdiscord_app === "undefined") return null;
    let req;
    try {
      webpackChunkdiscord_app.push([[Symbol()], {}, r => {
        if (Object.keys(r?.c || {}).length > Object.keys(req?.c || {}).length) req = r;
      }]);
      webpackChunkdiscord_app.pop();
    } catch { return null; }
    const isRest = p => p && (typeof p === "object" || typeof p === "function")
      && typeof p.get === "function" && typeof p.post === "function"
      && typeof p.del === "function" && !p._dispatcher;
    for (const m of Object.values(req?.c || {})) {
      try {
        const e = m?.exports;
        if (!e) continue;
        if (isRest(e)) return e;
        if (typeof e !== "object") continue;
        for (const k of Object.keys(e)) {
          try {
            const p = e[k];
            if (isRest(p)) return p;
            if (p && typeof p === "object" && isRest(p.default)) return p.default;
          } catch { }
        }
      } catch { }
    }
    return null;
  }

  /* ── way 2: copy the auth header Discord attaches to its own requests ── */
  function captureAuthHeader(timeoutMs = 60000) {
    return new Promise(resolve => {
      const origSet = XMLHttpRequest.prototype.setRequestHeader;
      const origFetch = window.fetch;
      let done = false;
      const finish = v => {
        if (done) return; done = true;
        XMLHttpRequest.prototype.setRequestHeader = origSet;
        window.fetch = origFetch;
        clearTimeout(timer);
        resolve(v);
      };
      XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (String(name).toLowerCase() === "authorization" && value) finish(value);
        return origSet.apply(this, arguments);
      };
      window.fetch = function (input, init) {
        try {
          // headers can be a plain object, an array of pairs, a Headers object, or inside a Request
          const v = (init?.headers && new Headers(init.headers).get("authorization"))
            || (input instanceof Request && input.headers.get("authorization"));
          if (v) finish(v);
        } catch { }
        return origFetch.apply(this, arguments);
      };
      const timer = setTimeout(() => finish(null), timeoutMs);
    });
  }

  /* ── one request layer for both ways ────────────────────── */
  let request; // (method, path, query) -> { status, body }
  const Rest = findRestModule();
  if (Rest) {
    const viaModule = async (method, path, query) => {
      try {
        const r = await Rest[method === "DELETE" ? "del" : "get"]({ url: path, query });
        return { status: r?.status ?? 200, body: r?.body };
      } catch (e) {
        return { status: e?.status ?? 0, body: e?.body };
      }
    };
    // test the module: it must return your own account
    const test = await viaModule("GET", "/users/@me");
    if (test.status === 200 && test.body?.id) {
      log("Using Discord's request module (tested OK).");
      request = viaModule;
    } else {
      log("Found a module, but it failed the test. Switching to the fallback.");
    }
  }
  if (!request) {
    log("Module not found. Scroll up a little in the DM now (this makes Discord send a request)...");
    const auth = await captureAuthHeader();
    if (!auth) return log("No Discord request seen in 60 s. Scroll in the DM and run again. Nothing was deleted.");
    log("Got it. Using direct requests to discord.com.");
    request = async (method, path, query) => {
      const qs = query ? "?" + new URLSearchParams(query) : "";
      try {
        const r = await fetch(`/api/v9${path}${qs}`, { method, headers: { Authorization: auth } });
        const text = await r.text();
        let body = null; try { body = text ? JSON.parse(text) : null; } catch { }
        return { status: r.status, body };
      } catch { return { status: 0, body: null }; }
    };
  }

  // retries for rate limits and server errors
  async function call(method, path, query) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await request(method, path, query);
      if (r.status >= 200 && r.status < 300) return r;
      if (r.status === 429) {
        const wait = (r.body?.retry_after ?? 5) * 1000 + 500;
        log(`Rate limited. Waiting ${Math.ceil(wait / 1000)} s.`);
        await sleep(wait); continue;
      }
      if (r.status === 0 || r.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
      throw r; // 401/403/404 etc.
    }
    throw { status: "retries" };
  }

  /* ── target ─────────────────────────────────────────────── */
  let me, ch;
  try { me = (await call("GET", "/users/@me")).body?.id; }
  catch (e) { return log(`Could not read your account (HTTP ${e?.status}). Nothing was deleted.`); }
  if (!me) return log("Your account came back empty. Nothing was deleted.");
  const chId = CHANNEL_ID || location.pathname.match(/^\/channels\/@me\/(\d+)/)?.[1];
  if (!chId) return log(`Open the DM first, or put its ID in CHANNEL_ID. Current page: ${location.pathname}`);
  try { ch = (await call("GET", `/channels/${chId}`)).body; }
  catch (e) { return log(`Could not open channel ${chId} (HTTP ${e?.status}). Nothing was deleted.`); }
  if (ch?.type !== 1 && ch?.type !== 3) {
    return log(`Not a DM (channel ${chId}, type ${ch?.type ?? "empty"}, page ${location.pathname}). Nothing was deleted.`);
  }
  const who = (ch.recipients || []).map(u => u.global_name || u.username).join(", ") || ch.name || chId;

  if (!DRY_RUN && !confirm(`Delete ALL your messages in the DM with ${who}?\n\nThis cannot be undone.`)) {
    return log("Cancelled. Nothing was deleted.");
  }

  /* ── main loop ──────────────────────────────────────────── */
  const DELETABLE = new Set([0, 19]); // 0 = normal message, 19 = reply. Call/pin notices can't be deleted.
  let before, scanned = 0, mine = 0, deleted = 0, skipped = 0, failed = 0;
  const t0 = Date.now();
  log(`${DRY_RUN ? "DRY RUN (count only)" : "DELETING"} in DM with ${who}. To stop: window.__dmWipeStop = true`);

  while (!window.__dmWipeStop) {
    let page;
    try {
      page = (await call("GET", `/channels/${chId}/messages`, before ? { limit: 100, before } : { limit: 100 })).body || [];
    } catch (e) { log(`Could not load messages (HTTP ${e?.status}). Stopping.`); break; }
    if (!page.length) break;
    before = page[page.length - 1].id; // oldest message on this page

    for (const m of page) {
      if (window.__dmWipeStop) break;
      scanned++;
      if (m.author?.id !== me) continue;
      mine++;
      if (!DELETABLE.has(m.type)) { skipped++; continue; }
      if (DRY_RUN) continue;
      try {
        await call("DELETE", `/channels/${chId}/messages/${m.id}`);
        deleted++;
        if (deleted % 25 === 0) log(`Deleted ${deleted} so far...`);
      } catch (e) {
        if (e?.status === 404) deleted++; // already gone
        else if (e?.status === 401) { log("Discord says you are logged out (HTTP 401). Stopping."); window.__dmWipeStop = true; }
        else { failed++; log(`Could not delete ${m.id} (HTTP ${e?.status ?? "?"}).`); }
      }
      await sleep(rnd(DELAY_MS));
    }
    log(`Scanned ${scanned} messages. Yours: ${mine}.`);
    await sleep(PAGE_DELAY_MS);
  }

  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  if (DRY_RUN) {
    const deletable = mine - skipped;
    if (window.__dmWipeStop) log("STOPPED early. The counts below cover only the messages scanned so far.");
    log(`${window.__dmWipeStop ? "STOPPED" : "DONE"} (dry run). Your messages: ${mine}. Deletable: ${deletable}. Not deletable (system notices): ${skipped}.`);
    log(`Estimated delete time: about ${Math.ceil(deletable * 1.5 / 60)} min. Set DRY_RUN = false and run again to delete.`);
  } else {
    log(`${window.__dmWipeStop ? "STOPPED" : "DONE"} in ${mins} min. Deleted: ${deleted}. Failed: ${failed}. Not deletable: ${skipped}.`);
  }
})();
