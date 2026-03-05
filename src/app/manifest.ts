import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/rpb-estimator",
    name: "RPB Estimator",
    short_name: "RPB",
    description: "Estimator biaya RPB berbasis data Excel",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#2e3192",
    lang: "id-ID",
    icons: [
      {
        src: "/icons/logorpb.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
