/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Map Tailwind color names to your CSS variables from index.css
        navy: "var(--color-navy)",
        "navy-2": "var(--color-navy-2)",
        "brand-start": "var(--color-brand-start)",
        "brand-end": "var(--color-brand-end)",
        bg: "var(--color-bg)",
      },
    },
  },
  plugins: [],
};
