# DM Wipe

Delete **your own** messages in **one** Discord DM — no matter how old they are.

One small, readable JavaScript file. You paste it into your browser console on discord.com. It counts first, asks before deleting, and goes slowly.

> [!WARNING]
> - **Deleting cannot be undone.** Messages are removed for both people.
> - **Automating a user account is against [Discord's Terms of Service](https://discord.com/terms).** Your account could be limited or banned. Use at your own risk.
> - **Only paste code you have read.** Pasting scripts into the console is the most common way people lose their Discord accounts. This file is short on purpose so you can check it.

---

## What it does

```
Open the DM  →  Run (dry run)  →  See the count  →  Set DRY_RUN = false  →  Run again  →  Confirm  →  Done
```

| | |
|---|---|
| ✅ Deletes | Your normal messages and your replies, in one DM or group DM |
| ❌ Does not delete | The other person's messages (Discord does not allow it) |
| ❌ Cannot delete | System notices (calls, pins). The script counts and skips them |
| 🚫 Refuses to run | In server channels |
| ⏱ Speed | About 40 messages per minute, to stay under Discord's rate limits |

Example run on a real DM:

```
[DM-Wipe] DRY RUN (count only) in DM with Alex. To stop: window.__dmWipeStop = true
[DM-Wipe] Scanned 636 messages. Yours: 312.
[DM-Wipe] DONE (dry run). Your messages: 312. Deletable: 295. Not deletable (system notices): 17.
...
[DM-Wipe] DONE in 9.7 min. Deleted: 295. Failed: 0. Not deletable: 17.
```

## How to use

1. Open **[discord.com/app](https://discord.com/app)** in Chrome, Edge or Firefox. (The desktop app hides the console.)
2. Open the DM you want to clean. The address should look like `discord.com/channels/@me/123456789…`
3. Press **F12** → open the **Console** tab.
4. Copy all of [`dm-wipe.js`](dm-wipe.js), paste it, press **Enter**.
   - If the browser blocks pasting, type `allow pasting`, press Enter, and paste again.
5. Type `DM-Wipe` in the console **Filter** box to hide Discord's own logs.
6. If it says *"Scroll up a little in the DM now"*, scroll the chat up a bit (within 60 s).
7. Read the dry-run count. If it looks right, change line `const DRY_RUN = true;` to `false`, refresh, and run again.
8. Click **OK** on the confirmation. Keep the tab open until you see `DONE`.
9. **Refresh the tab** when finished.

To stop at any time, run:

```js
window.__dmWipeStop = true
```

If it stops partway, just run it again — it continues with what is left.

## Settings

At the top of the script:

| Setting | Default | Meaning |
|---|---|---|
| `DRY_RUN` | `true` | `true` = count only. `false` = delete. |
| `CHANNEL_ID` | `""` | Empty = the DM open in the tab. Or paste a DM channel ID. |
| `DELAY_MS` | `[1100, 1800]` | Random wait between deletes, in ms. Faster is riskier. |
| `PAGE_DELAY_MS` | `600` | Wait between pages of 100 messages. |

## How it works

```
1. Try Discord's own request module (found in the page's webpack modules)
      └─ tested by asking for your own account; used only if the test passes
2. Otherwise: wait for Discord to send one of its own requests,
   copy its Authorization header, and call discord.com/api/v9 directly
3. GET  /channels/{id}               → check it is a DM or group DM
4. GET  /channels/{id}/messages      → page through ALL history, 100 at a time
5. DELETE /channels/{id}/messages/{m} → only where author = you, one by one
      └─ waits on 429 (rate limit) and retries on 5xx
```

There is no 14-day limit here. That limit applies to bots' *bulk* delete in servers. This script deletes one message at a time.

## Safety

- **Network:** the script only contacts `discord.com`. No other domains, no analytics, no updates from the internet.
- **Your token:** method 1 never touches it. Method 2 copies the header Discord already sends, keeps it in a local variable, and uses it only for `discord.com` requests. It is never printed, saved to storage, or sent elsewhere. Refreshing the tab clears it.
- **Check it yourself:** search the file for `fetch(` — every call uses a relative `/api/v9/...` path.
- **Only use the copy from [this repository](https://github.com/1elevenop/Discord-Tool-Hub/tree/main/dm-wipe).** Forks and re-uploads may be changed.

## Troubleshooting

| Message | Fix |
|---|---|
| `Run this on discord.com.` | You are on another site, or in the desktop app. |
| `Open the DM first…` | Open the DM so the address contains `/channels/@me/<id>`. |
| `Not a DM (…type 0…)` | That is a server channel. This tool only works in DMs. |
| `No Discord request seen in 60 s` | Scroll the chat while it waits, then run again. |
| `Rate limited. Waiting N s.` | Normal. It continues by itself. |
| `Could not delete … (HTTP 403)` | Discord refused that one message. It is skipped. |

## Alternatives

- **Official route (no ban risk):** request your data package from Discord, then send the DM's channel ID and message IDs to Discord support as a privacy/GDPR deletion request. Results vary, and it is slow.
- **[Undiscord](https://github.com/victornpb/undiscord):** a larger, well-known tool with a UI, filters and server support.

## License

[MIT](LICENSE). No warranty. The authors are not responsible for lost messages or account actions.

This project is not affiliated with or endorsed by Discord Inc.
