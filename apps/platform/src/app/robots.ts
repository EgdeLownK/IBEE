import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const CRAWLER_AGENTS = [
  'Googlebot',
  'Bingbot',
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'PerplexityBot',
  'OAI-SearchBot',
  'Google-Extended',
  'Amazonbot',
] as const

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      ...CRAWLER_AGENTS.map((userAgent) => ({
        userAgent,
        allow: '/',
      })),
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/login'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
