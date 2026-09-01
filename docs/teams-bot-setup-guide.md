# Teams "Hi" Bot — Full Setup Guide (POC)

Goal: a bot registered via Teams Developer Portal, connected to Teams, that responds "Hi" when messaged. This walks through every ID/secret and exactly where it lives.

This guide uses the **Teams Developer Portal** route throughout — no Azure Bot resource needed. That's the right call if your Azure subscription doesn't have Marketplace resource creation enabled (common in orgs that lock this down), and it's the simpler path for a Teams-only bot anyway.

---

## The moving pieces (so the IDs make sense later)

| Thing | What it is | Where you get it |
|---|---|---|
| **Bot ID** | Identity of your bot app (same concept as an "App ID") | Teams Developer Portal → Tools → Bot management |
| **Client secret** | Password for that identity | Same bot's page → Client secrets tab |
| **Endpoint address** | The URL Teams sends messages to | Same bot's page |
| **Teams App ID** | ID of the Teams app package (separate from the Bot ID) | Auto-generated when you create the app manifest |

You'll create these in this order: **Bot registration → Bot code + tunnel → Point endpoint at tunnel → Teams app manifest → Upload to Teams**.

---

## Step 1 — Register the bot in Teams Developer Portal

1. Go to **dev.teams.microsoft.com** → sign in with your org account.
2. Left menu → **Tools** → **Bot management**.
3. Click **+ New bot** (if this does nothing or errors in the browser console, see the note below — it's a known permissions issue).
4. Give it a name (e.g. `hi-bot-poc`) → Create.
5. This generates a **Bot ID** — copy and save it, you'll need it again for the app manifest later.
6. On the bot's page, open the **Client secrets** tab → generate a new secret → **copy the value immediately** (shown once only — if you miss it, generate a new one).

**If "+ New bot" does nothing when clicked:** your account likely lacks permission to register apps in Entra ID under the hood — Dev Portal needs that permission even though it hides the Entra UI from you. Ask your Entra/Azure admin to grant you the **Application Developer** role, or to register the bot for you and hand you the Bot ID + secret.

You now have: `Bot ID`, `Client secret`.

---

## Step 2 — Write the bot code (Node.js, Microsoft 365 Agents SDK)

The old `botbuilder` SDK is deprecated; use the **Microsoft 365 Agents SDK** for new bots.

```bash
mkdir hi-bot-poc && cd hi-bot-poc
npm init -y
npm install @microsoft/agents-hosting @microsoft/agents-hosting-express restify dotenv
```

Create `.env`:
```
CLIENT_ID=<Bot ID from Step 1>
CLIENT_SECRET=<Client secret from Step 1>
PORT=3978
```

Create `index.js`:
```javascript
require('dotenv').config();
const restify = require('restify');
const { AgentApplication, MemoryStorage } = require('@microsoft/agents-hosting');
const { authorizeJWT } = require('@microsoft/agents-hosting-express');

const storage = new MemoryStorage();
const app = new AgentApplication({ storage });

// Respond "Hi" to any message
app.onActivity('message', async (context) => {
  await context.sendActivity('Hi');
});

const server = restify.createServer();
server.use(authorizeJWT());
server.post('/api/messages', async (req, res) => {
  await app.run(req, res);
});

server.listen(process.env.PORT || 3978, () => {
  console.log(`Bot listening on port ${process.env.PORT || 3978}`);
});
```

> If package names above have shifted slightly by the time you install, check `npm search @microsoft/agents-hosting` — this SDK is actively evolving. The core idea (listen on `/api/messages`, reply "Hi" to any `message` activity) stays the same across SDK versions.

Run it locally:
```bash
node index.js
```

---

## Step 3 — Expose it to the internet (for testing only)

Teams needs a public HTTPS URL. For a POC, use a tunnel:

```bash
ngrok http 3978
```

Copy the `https://xxxx.ngrok-free.app` URL it gives you.

*(For anything beyond a POC, deploy to a proper host — e.g. Azure Web App — instead. No tunnel needed, and it's what you'd use in production.)*

---

## Step 4 — Point your bot registration at your endpoint

Back in Teams Developer Portal → **Tools → Bot management → your bot**, find the **Endpoint address** field and set it to:
```
https://xxxx.ngrok-free.app/api/messages
```
Save.

⚠️ Every time you restart ngrok, the URL changes — come back here and update this field again.

A bot registered this way already lives natively in Teams — there's no separate "enable Teams channel" step to do.

---

## Step 5 — Build the Teams app package (manifest)

1. Still in Teams Developer Portal, go to **Apps → New app**.
2. **Basic information**: app name, short/long description, developer info, privacy/terms URLs (placeholders are fine for POC).
3. **Branding**: upload a 32x32 and 192x192 icon (any placeholder PNGs work for POC).
4. **App features → Bot**:
   - Choose **"Enter a bot ID"**
   - Paste the **Bot ID from Step 1** (this must match exactly — this is the field people usually get wrong)
   - Scope: check **Personal** (add Team/Group chat later if needed)
5. Save. The portal auto-generates a **Teams App ID** (a separate GUID from the Bot ID — don't confuse the two) and builds the manifest for you.

---

## Step 6 — Test it

1. In Teams Developer Portal, on your app's page, click **Preview in Teams** (top right).
2. Teams opens, installs the app for you personally, and you can chat with it.
3. Type anything → bot should reply "Hi".

---

## Step 7 — Roll out to the org (your Teams admin role)

1. In Developer Portal, **Publish → App package** → **Download app package** (a .zip with manifest + icons).
2. As Teams admin, go to **admin.teams.microsoft.com** → **Teams apps → Manage apps → Upload new app** (or **Upload a custom app**, depending on your admin center version).
3. Set the **app setup policy** to make it available to a pilot group, or publish it org-wide once you're happy.

---

## Quick troubleshooting checklist

- **Bot doesn't respond**: check ngrok is still running, and that the Endpoint address in Dev Portal matches the current ngrok URL exactly, ending in `/api/messages`.
- **"Bot ID doesn't match" in Teams**: the ID entered in the manifest's Bot feature must equal the Bot ID from Step 1 — not the Teams App ID.
- **401/auth errors**: double check the client secret hasn't expired and your `.env` values have no typos or trailing spaces.
- **Works locally, fails when uploaded**: usually the Endpoint address wasn't updated in Dev Portal after ngrok restarted (ngrok URLs change every restart on the free tier).

---

## Once "Hi" works

For actual interaction/config as you mentioned — Adaptive Cards, dialogs, and calling your own APIs from the bot — that's a separate next step built on top of this same skeleton (the `app.onActivity('message', ...)` handler is where that logic goes). Happy to help wire that up once the POC round-trip is confirmed working.