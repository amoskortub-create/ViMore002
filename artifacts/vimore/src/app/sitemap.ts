import { MetadataRoute } from 'next';

const BASE_URL = 'https://vimore.cfd';

/**
 * Next.js dynamic sitemap — automatically served at /sitemap.xml.
 * Lists all public, indexable routes with their relative priority.
 * Private/auth routes (dashboard, settings, messages, etc.) are excluded
 * since they require login and offer no value to search crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // ── Core public pages ─────────────────────────────────────────────────────
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // ── Discovery & content ───────────────────────────────────────────────────
    {
      url: `${BASE_URL}/explore`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/reels`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/music`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/marketplace`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },

    // ── Platform info ─────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/how-it-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/coming-soon`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },

    // ── Legal ─────────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },

    // ── Developer portal ──────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/developer`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/developer/sdk`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
