# image-background-remover

**A privacy-first, self-hostable background remover — an open-source alternative to remove.bg.**

Upload any image and get a transparent PNG in seconds. No account, no upload stored on disk.
Built with **Next.js 14 (App Router) + Tailwind CSS 3 + TypeScript**, powered by the
[remove.bg](https://remove.bg) API on the server side, and deployed to **Cloudflare Pages**.

> 🌐 Live demo: https://image-background-remover-259.pages.dev
> 📦 Source: https://github.com/nchengc/image-background-remover

---

## Why this exists

Most "free" background removers either require an account, store your uploads on their servers,
or lock output quality behind a paywall. This project is a minimal, transparent, and
**self-hostable** implementation you can run yourself in minutes — the entire processing
pipeline is open and auditable.

It is positioned as a lightweight, privacy-respecting **open-source alternative to remove.bg**:
same core capability, but you own the deployment, the data never touches our disk, and there is
no vendor lock-in.

## Features

- **One-click background removal** — drop a PNG/JPG and download a transparent PNG
  (`<original>-nobg.png`).
- **Privacy by design** — images are forwarded to remove.bg **in memory only**, never written to
  disk or persisted. This is stated explicitly in the UI and the [privacy policy](https://image-background-remover-259.pages.dev/privacy).
- **Zero registration** — the tool works immediately, no sign-up wall (anonymous users get a
  small free allowance).
- **Optional Google sign-in** — sign in to claim a larger monthly free quota. The login UI is wired
  via [Supabase](https://supabase.com) (Auth + Postgres); server-side per-user quota enforcement is
  the next step.
- **Scenario-tuned pages** — dedicated guides for the most common intents, each with its own
  industry rules and FAQ:
  - [ID photo background swap](https://image-background-remover-259.pages.dev/id-photo)
  - [White background product shots](https://image-background-remover-259.pages.dev/white-background)
  - [E-commerce product cutouts](https://image-background-remover-259.pages.dev/product-photo)
  - [Logo to transparent background](https://image-background-remover-259.pages.dev/logo-transparent)
  - [Signature cutout](https://image-background-remover-259.pages.dev/signature)
- **SEO-ready** — semantic HTML, JSON-LD structured data (WebSite / WebApplication / HowTo /
  BreadcrumbList / FAQPage), sitemap, and robots.txt out of the box.
- **Edge-deployed** — fully static front end on Cloudflare's CDN; the API proxy runs as a
  Cloudflare Pages Function.

## How it works

```
 Browser (Next.js static export)
        │  POST /api/remove-bg  (multipart image, same-origin)
        ▼
 Cloudflare Pages Function  functions/api/remove-bg.ts
        │  - reads REMOVE_BG_API_KEY from env (server-only)
        │  - forwards image IN MEMORY to remove.bg (never written to disk)
        ▼
 remove.bg API  →  transparent PNG  →  streamed back to browser
```

Key design choices:

- The front end is **statically exported** to `out/` — no server render wait, instant loads.
- The background-removal proxy is a **separate Pages Function** (`functions/api/remove-bg.ts`),
  called same-origin so there are no CORS issues and the API key never reaches the client.
- The remove.bg API key lives **only** in environment variables / `.env.local` — never in code,
  never committed.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in REMOVE_BG_API_KEY
npm run dev                        # http://localhost:3000
```

Open the page, drag-and-drop or click to upload a PNG/JPG, and the transparent result downloads
automatically.

## Deploy to Cloudflare Pages (GitHub integration)

After authorizing GitHub once in the Cloudflare dashboard, the Pages project binds to
`nchengc/image-background-remover`. Build settings:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `out` |
| Production branch | `main` |

Every `git push` to `main` triggers a fresh build and deploy. The `functions/` directory is
auto-detected by Cloudflare as Pages Functions — no extra configuration needed.

Set the environment variable `REMOVE_BG_API_KEY` in the Pages project
(**Settings → Variables and Secrets**).

## Limitations (kept honest)

- The free remove.bg tier allows **~50 images / month**; scaling requires a paid plan.
- Free-tier output is downscaled by remove.bg (roughly ≤ 0.25 MP). This is a supplier limit,
  not a code limitation.
- If the key is missing or remove.bg is unreachable, the UI shows a clear error instead of a
  blank screen.

## Roadmap

- [ ] Self-hostable model option (on-device / open-weight) to remove the remove.bg dependency
- [ ] Batch processing
- [ ] More scenario pages (stamps, pets, icons, packaging) following the
      [doorway-page-safe](docs/SEO-STRATEGY.md) content rules
- [ ] WebP/AVIF output for smaller assets

## Contributing

PRs and issues are welcome — especially around the privacy model, alternative inference
backends, and documentation. Please keep the "no image stored on disk" guarantee intact.

## License

MIT — see the repository for details.
