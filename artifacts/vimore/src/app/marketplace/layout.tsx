import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace | ViMore — Buy & Sell in Liberia',
  description:
    'Buy and sell products safely on ViMore Marketplace — Liberia\'s social commerce platform. List your products and reach thousands of buyers for free.',
  openGraph: {
    title: 'ViMore Marketplace — Buy & Sell in Liberia',
    description: 'List products and reach buyers across Liberia. Free, safe, and social commerce.',
    url: 'https://vimore.cfd/marketplace',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ViMore Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ViMore Marketplace',
    description: 'Buy and sell in Liberia — free and social.',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
