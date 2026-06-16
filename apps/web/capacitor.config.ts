import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.khata.app",
  appName: "Khata",
  webDir: "dist",
  server: {
    // WebView loads the live deployed URL instead of bundled assets.
    // Every Vercel deploy is instantly live in the app — no APK rebuild needed.
    url: "https://khata.raja-dev.me",
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      // Hold the splash until React signals first paint (SplashScreen.hide()),
      // so there's no white flash between the native launch screen and the
      // webview drawing. Matches the app's dark background.
      launchAutoHide: false,
      backgroundColor: "#0a0a0b",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
