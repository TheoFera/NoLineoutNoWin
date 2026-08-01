import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "fr.partagetonjeu.nolineoutnowin",
  appName: "No Lineout No Win",
  webDir: "dist",
  plugins: {
    SystemBars: {
      insetsHandling: "css",
      style: "DARK",
      hidden: false
    }
  }
};

export default config;
