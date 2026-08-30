import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music | ViMore — Stream & Upload Liberian Music',
  description:
    'Stream the hottest Liberian music, discover new artists, and earn from your tracks on ViMore Music — the creator-first music platform by Media Tech Liberia.',
  openGraph: {
    title: 'ViMore Music — Stream & Upload Liberian Music',
    description: 'Stream music, discover artists, and earn from your tracks. Built for Liberian creators.',
    url: 'https://vimore.cfd/music',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ViMore Music' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ViMore Music',
    description: 'Stream Liberian music and upload your own tracks to earn.',
  },
};

export default function MusicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
