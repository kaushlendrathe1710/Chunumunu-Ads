import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./client/index.html', './client/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'wave-1': {
          '0%, 100%': {
            height: 'var(--wave-height-min)',
          },
          '50%': {
            height: 'var(--wave-height-max)',
          },
        },
        'wave-2': {
          '0%, 100%': {
            height: 'var(--wave-height-min)',
          },
          '50%': {
            height: 'var(--wave-height-max)',
          },
        },
        'wave-3': {
          '0%, 100%': {
            height: 'var(--wave-height-min)',
          },
          '50%': {
            height: 'var(--wave-height-max)',
          },
        },
        'wave-4': {
          '0%, 100%': {
            height: 'var(--wave-height-min)',
          },
          '50%': {
            height: 'var(--wave-height-max)',
          },
        },
        'wave-5': {
          '0%, 100%': {
            height: 'var(--wave-height-min)',
          },
          '50%': {
            height: 'var(--wave-height-max)',
          },
        },
        heartbeat: {
          '0%': {
            transform: 'scale(1)',
          },
          '25%': {
            transform: 'scale(1.1)',
          },
          '50%': {
            transform: 'scale(1)',
          },
          '75%': {
            transform: 'scale(1.2)',
          },
          '100%': {
            transform: 'scale(1)',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'wave-1': 'wave-1 1s ease-in-out infinite',
        'wave-2': 'wave-2 1.1s ease-in-out infinite',
        'wave-3': 'wave-3 1.2s ease-in-out infinite',
        'wave-4': 'wave-4 1.3s ease-in-out infinite',
        'wave-5': 'wave-5 1.4s ease-in-out infinite',
        heartbeat: 'heartbeat 1.3s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config;
