import type { APIRoute } from 'astro'

export const GET: APIRoute = () => {
  const siteUrl = import.meta.env.SITE_URL

  const body = `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: *
Allow: /
Disallow: /dashboard

Sitemap: ${siteUrl}/sitemap.xml`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
