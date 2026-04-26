import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer", "pptxgenjs"],
}

export default nextConfig
