import { BehanceIcon, InstagramIcon, LinkedinIcon } from '../components/BrandIcons'
import { socials } from '../config/site'

/** Only links with a configured URL are rendered. */
export const socialLinks = [
  { label: 'Instagram', href: socials.instagram, icon: InstagramIcon },
  { label: 'LinkedIn', href: socials.linkedin, icon: LinkedinIcon },
  { label: 'Behance', href: socials.behance, icon: BehanceIcon },
].filter((s) => !!s.href)
