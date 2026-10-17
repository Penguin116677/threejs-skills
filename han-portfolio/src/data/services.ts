import type { LucideIcon } from 'lucide-react'
import { LayoutTemplate, Building2, PanelsTopLeft, ShoppingBag, MousePointerClick, RefreshCw } from 'lucide-react'

export type ServiceVisual = 'landing' | 'business' | 'portfolio' | 'ecommerce' | 'interactive' | 'redesign'

export interface Service {
  id: ServiceVisual
  index: string
  title: string
  description: string
  tags: string[]
  icon: LucideIcon
}

/** Edit service copy here. Order controls the layout. */
export const services: Service[] = [
  {
    id: 'landing',
    index: '01',
    title: 'Landing Pages',
    description:
      'Focused, conversion-led pages that tell one story clearly and guide visitors to a single action.',
    tags: ['Campaigns', 'Launches', 'Lead gen'],
    icon: LayoutTemplate,
  },
  {
    id: 'business',
    index: '02',
    title: 'Business Websites',
    description:
      'Credible multi-page sites that explain what you do, build trust and make it easy to get in touch.',
    tags: ['Multi-page', 'CMS-ready', 'SEO basics'],
    icon: Building2,
  },
  {
    id: 'portfolio',
    index: '03',
    title: 'Portfolio Websites',
    description:
      'Editorial showcases for creatives and studios, where the work leads and the layout gets out of the way.',
    tags: ['Galleries', 'Case studies'],
    icon: PanelsTopLeft,
  },
  {
    id: 'ecommerce',
    index: '04',
    title: 'E-commerce Websites',
    description:
      'Product-first storefront design with clear browsing, considered product pages and a calm checkout path.',
    tags: ['Product pages', 'Collections'],
    icon: ShoppingBag,
  },
  {
    id: 'interactive',
    index: '05',
    title: 'Interactive Websites',
    description:
      'Motion-driven experiences with 3D, scroll storytelling and micro-interactions that stay fast and usable.',
    tags: ['3D / WebGL', 'Motion', 'Storytelling'],
    icon: MousePointerClick,
  },
  {
    id: 'redesign',
    index: '06',
    title: 'Website Redesign',
    description:
      'A fresh, modern take on an existing site — clearer structure, stronger visuals and better performance.',
    tags: ['Audit', 'Refresh', 'Rebuild'],
    icon: RefreshCw,
  },
]
