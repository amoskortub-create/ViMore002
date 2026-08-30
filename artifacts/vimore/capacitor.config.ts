import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cfd.mediatech.vimore',
  appName: 'ViMore',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    url: 'https://vimore.cfd',
    cleartext: false,
    allowNavigation: [
      'vimore.cfd',
      '*.vimore.cfd',
      'mediatechliberia.online',
      '*.mediatechliberia.online',
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#6200ea',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: '#6200ea',
      style: 'DARK',
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
