/**
 * Central site configuration. Anything brand- or URL-related should be read
 * from here so metadata, sitemap, structured data and UI stay in sync.
 */
const rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lodger-ancient.vercel.app';

export const siteConfig = {
  name: 'Lodger',
  shortName: 'Lodger',
  tagline: 'Student living, simplified',
  description:
    'Lodger helps university students find, compare and rent verified homes near campus — and gives landlords one place to list properties, sign leases and collect rent.',
  url: rawUrl.replace(/\/$/, ''),
  locale: 'en_NG',
  keywords: [
    'student housing',
    'student accommodation',
    'off-campus housing',
    'student apartments',
    'rooms near university',
    'hostel near campus',
    'rent for students',
    'list property for students',
  ],
  blogUrl: 'https://lodger-blog.vercel.app/',
  supportEmail: 'support@lodger.com',
  supportWhatsApp: 'https://wa.me/2348109432202',
  supportPhone: '08109432202',
  themeColor: '#77773c',
  social: {
    twitter: '',
    instagram: '',
    github: '',
  },
} as const;

export type SiteConfig = typeof siteConfig;

/** Builds an absolute URL for the given path. */
export function absoluteUrl(path = '/'): string {
  return `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`;
}
