import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Necesario para la imagen Docker: genera un servidor autocontenido.
  output: "standalone",
  // En el monorepo, el tracing debe abarcar la raíz para incluir node_modules.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
