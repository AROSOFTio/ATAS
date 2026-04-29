/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        mist: "#dbe6f5",
        accent: "#55c6a9",
        glow: "#fed766"
      },
      boxShadow: {
        panel: "0 20px 60px rgba(0, 0, 0, 0.32)"
      }
    }
  },
  plugins: []
};
