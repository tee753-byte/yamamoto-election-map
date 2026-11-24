import type { MetadataRoute } from "next";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  BRAND_COLOR,
} from "@/lib/constants/app";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F7",
    theme_color: BRAND_COLOR,
    lang: "ja",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
