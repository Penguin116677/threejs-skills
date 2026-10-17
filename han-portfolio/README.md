# HAN — Cinematic Web Designer Portfolio

A dark, cinematic single-page portfolio for **HAN — Web Designer & Digital Experience Creator**.

React 19 · Vite · TypeScript · Tailwind CSS v4 · Framer Motion · Three.js / React Three Fiber / Drei · Lucide

## Run it

```bash
cd han-portfolio
npm install
npm run dev        # local dev server → http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build → http://localhost:4173
```

`dist/` is a static site (relative asset paths), deployable to Netlify, Vercel, GitHub Pages, Cloudflare Pages, etc.

## Make it yours — edit these files

| What | Where |
| --- | --- |
| WhatsApp number, email, socials, form endpoint, portrait photo, site URL | `src/config/site.ts` |
| Services copy | `src/data/services.ts` |
| Projects (all marked **concept**) | `src/data/projects.ts` |
| Form project types & budget ranges | `src/data/inquiry.ts` |
| Navigation | `src/data/navigation.ts` |
| About copy & principles | `src/sections/About.tsx` (top of file) |
| Page title, description, Open Graph | `index.html` |

Rules built in:

- **Empty values hide things.** No WhatsApp number → no WhatsApp button. No email → no email links. No social URL → that icon is hidden.
- **WhatsApp link** is generated from `contact.whatsappNumber` (digits, international format) as `https://wa.me/<number>?text=…`.
- **Form demo mode.** While `form.endpoint` is empty, the inquiry form validates input but tells visitors clearly that **nothing was sent**. Set it to a Formspree/Getform/Basin URL (or your own API that accepts a JSON POST) to deliver real messages.
- **Concept projects** show a "Concept project" badge. Set `isConcept: false` and update the copy when you add real client work. Add `image: 'work/your-shot.webp'` (file in `public/work/`) to replace the procedural preview, and `liveUrl` to show a "Visit live site" button.
- **Portrait.** Put a photo in `public/` and set `profile.photo` — the abstract placeholder is replaced automatically.
- After deploying, set `og:image` in `index.html` to an absolute URL (e.g. `https://your-domain/og-image.png`) so social previews resolve.

## Structure

```
src/
  config/     site.ts — personal details & contact settings
  data/       services, projects, navigation, inquiry options, socials
  sections/   Navigation, Hero, Marquee, Services, Work, Process, About, Contact, Footer
  components/ Button, HeroVisual, FallbackSculpture, ProjectArt, ProjectModal, InquiryForm, Cursor, …
  three/      HeroScene.tsx — lazy-loaded WebGL hero
  hooks/      media queries, scroll state, body lock, focus trap
  lib/        motion tokens, capability detection
  styles/     index.css — design tokens, keyframes, utilities
```

## Performance & accessibility notes

- The 3D hero is a **separate lazy chunk**, loaded after first paint, only when WebGL is available, the device isn't low-end (CPU/RAM/Save-Data/2G heuristics) and reduced motion is off. Otherwise a lightweight CSS/SVG sculpture is shown. If frame rate drops, resolution is lowered and then the scene falls back to CSS.
- Lighting is procedural (no HDR downloads); the render loop pauses when the hero is off-screen or the tab is hidden.
- `prefers-reduced-motion` disables the WebGL scene, cursor follower, grain, marquee and parallax.
- Project modal: focus trap, `Esc` to close, deep links (`#project/aureon`), browser Back closes it.
- Skip link, visible focus rings, labelled form fields with inline errors and a live status region.
