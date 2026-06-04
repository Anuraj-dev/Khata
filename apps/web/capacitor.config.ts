import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.khata.app",
  appName: "Khata",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
    },
  },
};

export default config;
