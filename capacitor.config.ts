import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fr.nolineout.nowin",
  appName: "No Lineout No Win",
  webDir: "dist",
  bundledWebRuntime: false,
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
      hidden: false
    }
  }
};

export default config;
