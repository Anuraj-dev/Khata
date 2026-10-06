import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.khata.app",
  appName: "Khata",
  webDir: "dist",
  // The WebView boots from the web build bundled into the APK
  // (https://localhost/...). It used to load server.url
  // https://khata.raja-dev.me instead. When that host didn't resolve or was
  // slow, nothing loaded, SplashScreen.hide() never ran, and the app sat on the
  // logo forever. The bundled build talks straight to Convex, so it doesn't
  // need the website to be up. Web changes now need a new APK.
  server: {
    androidScheme: "https",
  },
  android: {
    // Paint the WebView dark before the first frame so no white flash shows
    // after the splash goes away.
    backgroundColor: "#0a0a0b",
    buildOptions: {
      keystorePath: undefined,
    },
  },
  plugins: {
    SplashScreen: {
      // Hide on a native timer so the splash can never get stuck. React still
      // calls SplashScreen.hide() on first commit, which usually comes sooner.
      launchAutoHide: true,
      launchShowDuration: 1500,
      launchFadeOutDuration: 200,
      backgroundColor: "#0a0a0b",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
