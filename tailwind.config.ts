import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Ensure all your component and page paths are listed here
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  
  // Necessary for modern Shadcn/ui theme toggling
  darkMode: "class", 

  theme: {
    extend: {
      colors: {
        // --- ADDED CHART COLORS ---
        // These reference the CSS variables you added to globals.css
        "chart-1": "oklch(var(--chart-1))",
        "chart-2": "oklch(var(--chart-2))",
        "chart-3": "oklch(var(--chart-3))",
        "chart-4": "oklch(var(--chart-4))",
        "chart-5": "oklch(var(--chart-5))",
        
        // --- NOTE: You MUST ensure your other Shadcn base colors (primary, secondary, etc.) 
        // are also included here if they are not already. If they were missing, they need to be defined
        // in your globals.css and referenced here as well. ---
      },
      // Keep any existing fontFamily, spacing, etc. configurations here
    },
  },
  plugins: [], // Add your existing plugins here, if any
};

export default config;