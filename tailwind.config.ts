import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        valorant: ['Rajdhani', 'sans-serif']
      },
      colors: {
        valorant: {
          dark: '#091423',
          panel: '#0f1f35',
          accent: '#ff4655',
          mint: '#3bf0d0'
        }
      },
      backgroundImage: {
        'store-radial': 'radial-gradient(circle at top, #163a63 0%, #081221 50%, #050a13 100%)'
      }
    }
  },
  plugins: []
};

export default config;
