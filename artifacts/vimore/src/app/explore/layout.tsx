import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore | ViMore — Discover Creators & Trending Content',
  description:
    'Discover trending creators, hashtags, and content hubs on ViMore — Liberia\'s premier social platform by Media Tech Liberia.',
  openGraph: {
    title: 'Explore ViMore — Discover Creators & Trending Content',
    description: 'Find the top creators, trending hashtags, and live events on ViMore.',
    url: 'https://vimore.cfd/explore',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ViMore Explore' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Explore ViMore',
    description: 'Discover trending Liberian creators and content.',
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
