import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works | ViMore — The Liberian Super-App',
  description:
    'Learn how ViMore works — from social posts and reels to creator earnings in USD and LRD. Built by Amos B. Kortu and Media Tech Liberia for West Africa.',
  openGraph: {
    title: 'How ViMore Works — The Liberian Super-App',
    description: 'See how ViMore powers creators, vendors, and communities across Liberia.',
    url: 'https://vimore.cfd/how-it-works',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'How ViMore Works' }],
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
