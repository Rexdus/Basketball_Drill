import type { NextConfig } from "next";

// GitHub Pages is a static file host: no server, no database, no API routes.
// Setting STATIC_EXPORT=true switches this build into a fully static export
// (`output: "export"`) that can be served from any static host, including
// GitHub Pages. The default (unset) keeps the normal server build so the app
// can also run locally with `next dev` / `next start`.
const staticExport = process.env.STATIC_EXPORT === "true";

// Project sites on GitHub Pages are served from /<repo-name>/. The deploy
// workflow sets NEXT_PUBLIC_BASE_PATH to the repository name automatically.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  // Static hosts serve /page/ from page/index.html, so trailing slashes are
  // required for clean deep links in the export.
  trailingSlash: staticExport ? true : false,
  // The image optimizer needs a server; static hosts get plain <img> tags.
  images: { unoptimized: true },
  ...(staticExport ? { output: "export" as const } : {}),
};

export default nextConfig;
