# Morries Reminder Cloud Sync

This worker is the public sync server for Morries Reminder. It lets the desktop app and phone web app share the same reminder data from any network.

## Deploy on Cloudflare

1. Install Wrangler and log in:

```bash
npm install -g wrangler
wrangler login
```

2. Create the KV storage:

```bash
wrangler kv namespace create MORRIES_REMINDER_SYNC
```

3. Copy `wrangler.toml.example` to `wrangler.toml`, then replace the KV `id` with the id from step 2.

4. Deploy:

```bash
wrangler deploy
```

5. Copy the Worker URL, for example `https://morries-reminder-sync.yourname.workers.dev`, into **Settings > Cloud sync** in Morries Reminder.

Use the same private sync key on every device. The app can generate one from the desktop settings if you leave the key empty and save cloud sync on the PC first.
