/**
 * ─────────────────────────────────────────────────────────────
 *  SITE CONFIGURATION — edit this file to personalise the site.
 * ─────────────────────────────────────────────────────────────
 *  Anything left as an empty string ('') is treated as "not set"
 *  and the related button/link is hidden automatically.
 *  Nothing here is invented: replace the placeholders with your
 *  real details when you are ready.
 */

export const site = {
  brand: 'HAN',
  title: 'Web Designer & Digital Experience Creator',
  /** Used in <title>, meta and footer. */
  statement:
    'Independent web designer crafting modern, immersive and high-performing websites for brands that want to be remembered.',
  /** Public URL of the deployed site, used for canonical/OG tags (e.g. 'https://han.design'). */
  url: '',
  /** Location / availability label shown in the hero corner. Leave '' to hide. */
  availability: 'Available for new projects',
}

export const contact = {
  /**
   * WhatsApp number in international format, digits only, no "+" or spaces.
   * Example: '6281234567890'. Leave '' to hide the WhatsApp button.
   */
  whatsappNumber: '',
  /** Pre-filled WhatsApp message. */
  whatsappMessage: "Hi HAN, I'd like to talk about a website project.",
  /** Public email address. Leave '' to hide every email action. */
  email: '',
}

/** Social profiles — full URLs. Leave '' to hide a link. */
export const socials = {
  instagram: '',
  linkedin: '',
  behance: '',
}

export const form = {
  /**
   * Endpoint that accepts a JSON POST (e.g. a Formspree / Getform / Basin
   * form URL, or your own API). While this is '', the inquiry form runs in
   * DEMO MODE: it validates input but clearly tells visitors nothing was sent.
   */
  endpoint: '',
}

/** Optional real portrait. Put the file in /public and set e.g. 'portrait.jpg'. */
export const profile = {
  photo: '',
  photoAlt: 'Portrait of HAN',
}

// ── Derived helpers (no need to edit below) ──────────────────

export const whatsappUrl = contact.whatsappNumber
  ? `https://wa.me/${contact.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(contact.whatsappMessage)}`
  : ''

export const emailUrl = contact.email ? `mailto:${contact.email}` : ''
