/**
 * SELECTED WORK
 * ─────────────
 * These are CONCEPT PROJECTS — self-initiated design explorations,
 * not client work. Set `isConcept: false` (and update the copy)
 * when you replace one with a real project.
 *
 * `art` selects the procedural preview composition in
 * src/components/ProjectArt.tsx. To use a real screenshot instead,
 * put it in /public and set `image: 'work/your-file.webp'`.
 */

export type ProjectArtKey = 'aureon' | 'nexora' | 'velora' | 'orbital' | 'monolith' | 'liquid'

export interface Project {
  id: string
  name: string
  category: string
  isConcept: boolean
  summary: string
  concept: string
  goals: string[]
  features: string[]
  palette: string[]
  typography: string
  art: ProjectArtKey
  image?: string
  /** Optional live URL — the button is only shown when set. */
  liveUrl?: string
}

export const projects: Project[] = [
  {
    id: 'aureon',
    name: 'AUREON',
    category: 'Luxury Brand Landing Page',
    isConcept: true,
    summary: 'A quiet, gold-lit stage for a single hero product.',
    concept:
      'AUREON imagines a fragrance house launching one signature product. The page behaves like a gallery after dark: deep black space, a single warm light source, and editorial serif headlines that slow the reader down. Every scroll reveals one idea at a time, so the product always remains the centre of attention.',
    goals: ['Communicate exclusivity within five seconds', 'Keep the product as the only focal point', 'Lead calmly to a reservation CTA'],
    features: ['Spotlight hero with slow light sweep', 'Editorial scroll chapters', 'Ingredient story with fine-line illustrations', 'Minimal reservation flow'],
    palette: ['#0A0907', '#1A1611', '#C9A45C', '#F1E4C3'],
    typography: 'High-contrast serif display · light grotesk body',
    art: 'aureon',
  },
  {
    id: 'nexora',
    name: 'NEXORA',
    category: 'SaaS Product Website',
    isConcept: true,
    summary: 'Floating interface panels that explain a product by showing it.',
    concept:
      'NEXORA is a concept for an AI analytics platform. Instead of abstract claims, the site lets the interface do the talking: layered UI panels float in a violet atmosphere and assemble as you scroll, demonstrating each feature in context. The structure is built around clarity — problem, product, proof, pricing.',
    goals: ['Explain a complex product quickly', 'Make the interface feel tangible', 'Drive free-trial sign-ups'],
    features: ['Assembling UI panels on scroll', 'Feature tabs with live micro-demos', 'Transparent pricing table', 'Dark / light aware design tokens'],
    palette: ['#0B0820', '#1B1446', '#7B5CFF', '#C6B8FF'],
    typography: 'Geometric sans display · mono data labels',
    art: 'nexora',
  },
  {
    id: 'velora',
    name: 'VELORA',
    category: 'Fashion E-commerce',
    isConcept: true,
    summary: 'High-fashion editorial layouts that still shop effortlessly.',
    concept:
      'VELORA explores how a fashion label can feel like a printed lookbook without sacrificing usability. Oversized serif type overlaps imagery, collections read like magazine spreads, and product pages keep size, price and add-to-bag always within reach.',
    goals: ['Blend editorial storytelling with commerce', 'Keep purchase actions always visible', 'Feel premium on mobile first'],
    features: ['Lookbook-style collection pages', 'Sticky product purchase panel', 'Quick-view with image zoom', 'Considered empty & loading states'],
    palette: ['#F2EDE6', '#D9CFC2', '#8C1D18', '#141414'],
    typography: 'Didone serif display · neutral sans UI',
    art: 'velora',
  },
  {
    id: 'orbital',
    name: 'ORBITAL',
    category: 'Technology Startup Website',
    isConcept: true,
    summary: 'A planetary 3D story for a satellite-data startup.',
    concept:
      'ORBITAL is a concept for a company that turns satellite imagery into insight. A luminous planet anchors the hero and rotates as visitors scroll through the mission, technology and team. Data visualisations use the same glowing line language, connecting the brand story to the product.',
    goals: ['Make deep-tech feel approachable', 'Create a memorable signature visual', 'Attract investors and early partners'],
    features: ['Scroll-linked 3D planet', 'Orbit-path data visualisations', 'Mission timeline', 'Investor contact flow'],
    palette: ['#05070D', '#0E1A2E', '#39E1FF', '#B8FF6A'],
    typography: 'Wide technical sans · mono coordinates',
    art: 'orbital',
  },
  {
    id: 'monolith',
    name: 'MONOLITH',
    category: 'Creative Studio Website',
    isConcept: true,
    summary: 'Brutalist, monochrome and deliberately loud.',
    concept:
      'MONOLITH is a concept for an architecture-minded design studio. The grid is exposed, type is enormous and unapologetic, and the palette is strictly black and white. Experimental layouts break the grid on purpose, while navigation and contact remain completely predictable.',
    goals: ['Express a bold studio point of view', 'Be experimental without hurting usability', 'Stand out in a crowded market'],
    features: ['Exposed-grid layout system', 'Kinetic oversized typography', 'Project index with hover previews', 'Text-only fast-loading case studies'],
    palette: ['#000000', '#1F1F1F', '#BDBDBD', '#FFFFFF'],
    typography: 'Condensed grotesk display · monospaced captions',
    art: 'monolith',
  },
  {
    id: 'liquid-lab',
    name: 'LIQUID LAB',
    category: 'Interactive Creative Portfolio',
    isConcept: true,
    summary: 'Liquid 3D forms that react to the visitor.',
    concept:
      'LIQUID LAB is a concept portfolio for a 3D artist. Chrome-like liquid shapes respond to the cursor and morph between projects, turning navigation itself into part of the showcase. A lightweight fallback keeps the experience smooth on older phones.',
    goals: ['Turn browsing into an experience', 'Show technical craft without slowing the site', 'Keep content accessible without WebGL'],
    features: ['Cursor-reactive liquid shader', 'Morphing project transitions', 'Graceful non-WebGL fallback', 'Reduced-motion friendly mode'],
    palette: ['#0B0C10', '#2A2D35', '#FF6A00', '#E8ECF2'],
    typography: 'Soft rounded sans · mono annotations',
    art: 'liquid',
  },
]
