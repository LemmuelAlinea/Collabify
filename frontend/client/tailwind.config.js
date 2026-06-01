export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        collabify: {
          dark: '#072B87',
          deep: '#0B3DAF',
          cyan: '#28D7FF',
          green: '#23E66E',
          accent: '#00BFFF',
          text: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
          border: '#E2E8F0',
          hover: '#F8FAFC',
        },
      },
      borderRadius: {
        xl: '14px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 10px 30px rgba(15, 23, 42, 0.06)',
        lift: '0 18px 45px rgba(15, 23, 42, 0.10)',
      },
    },
  },
}
