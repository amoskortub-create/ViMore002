import type { Metadata, Viewport } from 'next';

export const maxDuration = 30;
import './globals.css';
import { headers } from 'next/headers';
import { Toaster } from "@/components/ui/toaster";
import { PostProvider } from "@/context/PostContext";
import { MusicProvider } from "@/context/MusicContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { MusicPlayer } from "@/components/music/music-player";
import { AlbumDetail } from "@/components/music/album-detail";
import { PlaylistDetail } from "@/components/music/playlist-detail";
import { AdPortal } from "@/components/ad/ad-portal";
import { MusicAdPortal } from "@/components/music/interstitial-portal";
import { PostPortal } from "@/components/post/post-portal";
import { ImageViewerPortal } from "@/components/layout/image-viewer-portal";
import { VideoViewerPortal } from "@/components/layout/video-viewer-portal";
import { SearchPortal } from "@/components/layout/search-portal";
import { FontScaleWrapper } from "@/components/layout/font-scale-wrapper";
import { CommentHub } from "@/components/post/comment-hub";
import { GiftHub } from "@/components/post/gift-hub";
import { AppLoadingGate } from "@/components/layout/app-loading-gate";
import { SuspensionGate } from "@/components/layout/suspension-gate";
import { DiagnosticErrorBoundary } from "@/components/layout/diagnostic-error-boundary";
import { ThemeLogic } from "@/components/layout/theme-logic";
import { ServiceWorkerRegister } from "@/components/layout/service-worker-register";
import { SwUpdateNotifier } from "@/components/layout/sw-update-notifier";
import { PwaInstallPrompt } from "@/components/layout/pwa-install-prompt";
import { AppBadgeSync } from "@/components/layout/app-badge-sync";
import { PullToRefresh } from "@/components/layout/pull-to-refresh";
import { ActivityTracker } from "@/components/layout/ActivityTracker";
import { ExpiryCleanup } from "@/components/layout/expiry-cleanup";
import { PushAutoSubscribe } from "@/components/layout/push-auto-subscribe";
import { NotificationScheduler } from "@/components/layout/notification-scheduler";
import { GlobalRealtimeListener } from "@/components/layout/global-realtime";
import { OutboxRetry } from "@/components/layout/outbox-retry";
import { AdminAlertsProvider } from "@/context/AdminAlertsContext";
import { FeedSignalProvider } from "@/context/FeedSignalContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { ReelUploadProvider } from "@/context/ReelUploadContext";
import { ReelUploadBanner } from "@/components/reels/reel-upload-banner";
import NextTopLoader from 'nextjs-toploader';

// ── Structured data: tells Google this is a real, verified organization ────────
const JSON_LD_ORGANIZATION = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://vimore.cfd/#organization",
      "name": "Media Tech Liberia",
      "legalName": "Media Tech Liberia",
      "url": "https://vimore.cfd",
      "logo": {
        "@type": "ImageObject",
        "url": "https://vimore.cfd/icons/icon-512.png",
        "width": 512,
        "height": 512,
      },
      "founder": {
        "@type": "Person",
        "name": "Amos B. Kortu",
        "jobTitle": "Founder & Engineer",
        "worksFor": { "@id": "https://vimore.cfd/#organization" },
      },
      "foundingLocation": {
        "@type": "Country",
        "name": "Liberia",
      },
      "description":
        "Media Tech Liberia builds data-light, high-performance digital products for West Africa. ViMore is its flagship super-app for creators, vendors, and communities.",
      "sameAs": ["https://vimore.cfd"],
    },
    {
      "@type": "WebApplication",
      "@id": "https://vimore.cfd/#app",
      "name": "ViMore",
      "url": "https://vimore.cfd",
      "applicationCategory": "SocialNetworkingApplication",
      "operatingSystem": "Android, iOS, Web",
      "description":
        "Liberia's premier social marketplace and creator hub — social feeds, music, reels, messaging, and creator monetization in USD and LRD, all in one data-light app.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "currenciesAccepted": "USD, LRD",
      "author": { "@id": "https://vimore.cfd/#organization" },
      "publisher": { "@id": "https://vimore.cfd/#organization" },
    },
  ],
};

// ── Canonical metadata ─────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL("https://vimore.cfd"),

  title: "ViMore | The Liberian Super-App by Media Tech Liberia",
  description:
    "Experience ViMore, Liberia's premier social marketplace and creator hub. Engineered by Amos B. Kortu and Media Tech Liberia for a data-light, high-performance experience.",
  keywords: [
    "ViMore",
    "Amos B. Kortu",
    "Media Tech Liberia",
    "Liberian Tech Startup",
    "Creator Monetization Liberia",
    "Data-light Social Media",
    "Liberian Super-App",
    "Social Media Liberia",
    "Creator Earnings LRD USD",
  ],

  // Authorship & ownership — used by search engines to verify real people
  authors: [{ name: "Media Tech Liberia", url: "https://vimore.cfd" }],
  creator: "Media Tech Liberia",
  publisher: "Media Tech Liberia",
  applicationName: "ViMore",
  manifest: "/manifest.json",
  category: "social",

  // Open Graph — controls how the link looks on Facebook, WhatsApp, LinkedIn
  openGraph: {
    type: "website",
    locale: "en_LR",
    url: "https://vimore.cfd",
    siteName: "ViMore",
    title: "ViMore - Built for Liberia by Media Tech Liberia",
    description:
      "A 100% free, data-light platform for Liberian creators and vendors.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "ViMore — The Liberian Super-App",
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card: "summary_large_image",
    title: "ViMore | The Liberian Super-App",
    description:
      "A 100% free, data-light platform for Liberian creators and vendors.",
    images: ["/icons/icon-512.png"],
    creator: "@vimore_app",
  },

  // PWA icons
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
  },

  // iOS PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ViMore",
    startupImage: ["/icons/icon-512.png"],
  },

  formatDetection: { telephone: false },

  // Miscellaneous identity & platform tags
  other: {
    // Search-engine identity verification
    "author": "Media Tech Liberia",
    "owner": "Media Tech Liberia",
    // Existing site-verification token
    "6a97888e-site-verification": "078f262e3dacd42dc814159e1a856c2d",
    // PWA / Windows tile
    "mobile-web-app-capable": "yes",
    "application-name": "ViMore",
    "msapplication-TileColor": "#6200ea",
    "msapplication-TileImage": "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6200ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nextUrl =
    headersList.get("x-invoke-path") || headersList.get("x-pathname") || "";
  return (
    <html lang="en">
      <head>
        {/* Security */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="img-src 'self' * data: blob:; media-src 'self' * data: blob:; connect-src 'self' https://mediatechliberia.online https://appwrite.mediatechliberia.online wss: ws: https:;"
        />

        {/* JSON-LD: Organization + WebApplication structured data for Google Knowledge Graph */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD_ORGANIZATION) }}
        />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Legacy Safari / iOS 12 polyfills for Promise, fetch, and URL.createObjectURL */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  if(typeof Promise==='undefined'){var p=document.createElement('script');p.src='https://cdn.jsdelivr.net/npm/promise-polyfill@8/dist/polyfill.min.js';document.head.appendChild(p);}
  if(typeof fetch==='undefined'){var f=document.createElement('script');f.src='https://cdn.jsdelivr.net/npm/whatwg-fetch@3.6.20/fetch.min.js';document.head.appendChild(f);}
  if(typeof URL==='undefined'||typeof URL.createObjectURL==='undefined'){var u=document.createElement('script');u.src='https://cdn.jsdelivr.net/npm/url-polyfill@1.1.12/url.min.js';document.head.appendChild(u);}
})();
            `,
          }}
        />
      </head>
      <body
        className="font-body antialiased bg-background text-foreground"
        suppressHydrationWarning
      >
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        <NextTopLoader
          color="#9940E5"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #9940E5,0 0 5px #9940E5"
        />
        <NetworkProvider>
          <ReelUploadProvider>
          <FeedSignalProvider>
            <AdminAlertsProvider>
              <PostProvider>
                <LanguageProvider>
                  <NotificationProvider>
                    <MusicProvider>
                      <ThemeLogic />
                      <FontScaleWrapper>
                        <DiagnosticErrorBoundary title="System Core">
                          <AppLoadingGate>
                              <SuspensionGate>
                                <GlobalRealtimeListener />
                                <OutboxRetry />
                                <NotificationScheduler />
                                <AppBadgeSync />
                                <PushAutoSubscribe />
                                <PullToRefresh />
                                <ActivityTracker />
                                <ExpiryCleanup />
                                {children}
                                <MusicPlayer />
                                <AlbumDetail />
                                <PlaylistDetail />
                                <AdPortal />
                                <MusicAdPortal />
                                <PostPortal />
                                <ImageViewerPortal />
                                <VideoViewerPortal />
                                <SearchPortal />
                                <CommentHub />
                                <GiftHub />
                                <SwUpdateNotifier />
                                <ReelUploadBanner />
                                <Toaster />
                              </SuspensionGate>
                            </AppLoadingGate>
                        </DiagnosticErrorBoundary>
                      </FontScaleWrapper>
                    </MusicProvider>
                  </NotificationProvider>
                </LanguageProvider>
              </PostProvider>
            </AdminAlertsProvider>
          </FeedSignalProvider>
          </ReelUploadProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
