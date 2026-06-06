/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ocean-blue': '#0F4C75',
        'navy-blue': '#0B3C5D',
        'teal-blue': '#1293B8',
      },
    },
  },
  plugins: [],
}