import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reels | ViMore — Short Videos from Liberian Creators',
  description:
    'Watch and share short videos from the best Liberian creators on ViMore. Discover, like, and connect — all in a data-light experience.',
  openGraph: {
    title: 'ViMore Reels — Short Videos from Liberian Creators',
    description: 'Watch short videos from the best Liberian creators. Data-light and 100% free.',
    url: 'https://vimore.cfd/reels',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'ViMore Reels' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ViMore Reels',
    description: 'Short videos from Liberian creators — data-light and free.',
  },
};

export default function ReelsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
