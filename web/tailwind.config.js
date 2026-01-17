/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta corporativa ASLI
        'asli-light': '#F6EEE8',
        'asli-primary': '#007A7B',
        'asli-secondary': '#003F5A',
        'asli-dark': '#11224E',
        'asli-accent': '#669900',
      },
    },
  },
  plugins: [],
}

