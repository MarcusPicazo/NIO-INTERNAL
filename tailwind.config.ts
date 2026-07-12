import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        graphite: "#0d1115",
        "graphite-2": "#151b22",
        steel: "#a8b3bd",
        "steel-dark": "#38434d",
        ion: "#40e0d0",
        ember: "#f5a524",
        copper: "#c46f3a"
      },
      boxShadow: {
        "metal-soft": "0 24px 80px rgba(0,0,0,0.45)",
        "ion": "0 0 32px rgba(64,224,208,0.18)"
      },
      backgroundImage: {
        "radial-steel": "radial-gradient(circle at top left, rgba(64,224,208,0.16), transparent 32%), radial-gradient(circle at bottom right, rgba(245,165,36,0.14), transparent 36%)"
      }
    }
  },
  plugins: []
};

export default config;
