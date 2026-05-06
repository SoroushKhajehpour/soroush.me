import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

/** Directory containing this config file (the Next.js app root). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Avoid picking a parent folder's package-lock.json as the Turbopack root.
  turbopack: {
    root: projectRoot,
  },
  // Allow opening the dev site from another device on your LAN (e.g. http://10.0.0.115:3000).
  allowedDevOrigins: ["10.0.0.115"],
  // Fewer Turbopack writes under .next — helps flaky/network-backed filesystems (see NFS stale handle).
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
