/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ocean-blue': '#0E5A72',
        'navy-blue': '#073B4C',
        'teal-blue': '#168AAD',
        'coastal-sand': '#F4EBD8',
        'sunlit-foam': '#F8FBF8',
        'mist-blue': '#E5F1F2',
        'mangrove-green': '#2D6A4F',
        'sunset-coral': '#D96C4E',
      },
      boxShadow: {
        tourism: '0 20px 70px rgba(7, 59, 76, 0.08)',
        'tourism-hover': '0 26px 90px rgba(7, 59, 76, 0.14)',
      },
    },
  },
  plugins: [],
}