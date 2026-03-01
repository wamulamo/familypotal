import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        "chat-base": ["1rem", { lineHeight: "1.6" }],
        "chat-input": ["0.9375rem", { lineHeight: "1.5" }],
        "chat-sm": ["0.875rem", { lineHeight: "1.55" }],
        "chat-xs": ["0.75rem", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [],
};
export default config;
