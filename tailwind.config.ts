import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        '720': '720px',
      },
    },
  },
  plugins: [],
};

export default config;
