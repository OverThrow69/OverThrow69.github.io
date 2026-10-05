# Publish Morries Reminder for Google

Google cannot index a local address like `192.168.0.16` or `127.0.0.1`. Morries Reminder must be uploaded to a public HTTPS website first.

## Build the public web release

Use the final website URL when you know it:

```bash
npm run release:web -- --url=https://your-domain.example
```

The generated site is saved to:

```text
public-release/morries-reminder-site
```

Upload every file in that folder to your public host.

## Good hosting choices

- Cloudflare Pages
- Netlify
- Vercel
- GitHub Pages
- A normal domain hosting account

## Google indexing steps

1. Open the public URL and confirm it loads.
2. Confirm these URLs work:
   - `/robots.txt`
   - `/sitemap.xml`
   - `/manifest.webmanifest`
3. Add the domain to Google Search Console.
4. Submit `/sitemap.xml`.
5. Use URL Inspection and request indexing for the homepage.
6. Search later for:

```text
site:your-domain.example Morries Reminder
```

Google indexing can take time after publishing. The app is ready for crawling, but Google cannot list it before a public URL exists.
