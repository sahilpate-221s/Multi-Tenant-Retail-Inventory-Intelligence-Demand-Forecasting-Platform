import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});