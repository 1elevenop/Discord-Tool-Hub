# Discord Tool Hub

Small, readable tools for Discord users and developers. Each tool lives in its own folder with its own README and license.

## Tools

| Tool | What it does | How you run it |
|---|---|---|
| [DM Wipe](dm-wipe/) | Deletes **your own** messages in one DM or group DM, however old they are. Counts first and asks before it deletes. | Paste into the browser console on discord.com |

## Ground rules for every tool

- **Short and readable.** If you're asked to paste a tool into a console, you should be able to read all of it first.
- **Safe by default.** Anything that deletes or changes data starts with a dry run and asks before it acts.
- **Talks only to Discord.** No other servers, no analytics, no updates downloaded from the internet.
- **Never exposes your token.** It is never printed, saved, or sent anywhere except discord.com.
- **Honest about risk.** Automating a user account is against [Discord's Terms of Service](https://discord.com/terms). Any tool that does this says so at the top of its README.

## Adding a tool

1. Create a folder named after the tool, for example `my-tool/`.
2. Put the code, a `README.md` (what it does, how to use it, safety notes, troubleshooting) and a `LICENSE` inside it.
3. Add a row to the table above.

This project is not affiliated with or endorsed by Discord Inc.
