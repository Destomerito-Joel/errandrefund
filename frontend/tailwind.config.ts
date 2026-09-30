import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#172421',
        moss: '#28594b',
        mint: '#d9eee4',
        paper: '#f6f7f2',
        coral: '#d96b50',
      },
      boxShadow: {
        card: '0 16px 50px rgba(23, 36, 33, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'ui-serif', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
