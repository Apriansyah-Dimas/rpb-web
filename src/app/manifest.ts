import type { MetadataRoute } from "next";
import logoRpb from "./logorpb.svg";

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
    theme_color: "#6465b9",
    lang: "id-ID",
    icons: [
      {
        src: logoRpb.src,
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
