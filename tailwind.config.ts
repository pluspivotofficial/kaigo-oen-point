import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Noto Sans JP', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Zen Maru Gothic"', '"Hiragino Maru Gothic ProN"', 'system-ui', 'sans-serif'],
        body: ['"Zen Kaku Gothic New"', '"Hiragino Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "reward-gold": "hsl(var(--reward-gold))",
        "reward-purple": "hsl(var(--reward-purple))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Sakura style guide colors (新キー追加、既存palette には影響なし)
        coral: { DEFAULT: '#E85A4F', deep: '#D14535' },
        navy: { DEFAULT: '#1A2855', soft: '#4A5578' },
        pink: { soft: '#FFE4E9', mid: '#FFC0CB', deep: '#FFB6C1' },
        gold: { DEFAULT: '#F5C443', deep: '#E8A93F' },
        cream: '#FFF8F3',
        ink: { 100: '#F5F2EE', 200: '#E8E2DA', 300: '#C9C2B8' },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Sakura namespace (既存 sm/md/lg は触らない)
        "sakura-sm": "8px",
        "sakura-md": "14px",
        "sakura-lg": "22px",
        "sakura-xl": "28px",
      },
      boxShadow: {
        "sakura-soft":
          "0 1px 3px rgba(26,40,85,0.06), 0 1px 2px rgba(26,40,85,0.04)",
        "sakura-card":
          "0 4px 12px rgba(232,90,79,0.08), 0 2px 4px rgba(26,40,85,0.04)",
        "sakura-pop":
          "0 8px 24px rgba(232,90,79,0.12), 0 4px 8px rgba(26,40,85,0.06)",
        "sakura-celebration":
          "0 12px 32px rgba(232,90,79,0.25), 0 0 0 4px rgba(255,255,255,0.6)",
      },
      backgroundImage: {
        "gradient-sakura-coral":
          "linear-gradient(135deg, #FF8E6B 0%, #E85A4F 50%, #FF5577 100%)",
        "gradient-sakura-celebration":
          "linear-gradient(135deg, #E85A4F 0%, #F5C443 100%)",
        "gradient-sakura-bg":
          "linear-gradient(180deg, #FFF8F3 0%, #FFE4E9 50%, #FFF8F3 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(356 82% 72% / 0.3)" },
          "50%": { boxShadow: "0 0 30px hsl(356 82% 72% / 0.5)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "60%": { transform: "scale(1.1)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0", transform: "scale(0.5) rotate(0deg)" },
          "50%": { opacity: "1", transform: "scale(1.2) rotate(180deg)" },
        },
        "petal-fall": {
          "0%": { transform: "translateY(-20vh) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "0.7" },
          "90%": { opacity: "0.7" },
          "100%": {
            transform: "translateY(110vh) rotate(720deg)",
            opacity: "0",
          },
        },
        // Welcome page 専用 (Tailwind 標準の bounce/pulse とは衝突しない命名)
        "welcome-pulse": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "heart-bounce": {
          "0%, 100%": { transform: "translateY(0) scale(1) rotate(0deg)" },
          "25%": { transform: "translateY(-8px) scale(1.05) rotate(-5deg)" },
          "50%": { transform: "translateY(-12px) scale(1.15) rotate(0deg)" },
          "75%": { transform: "translateY(-8px) scale(1.05) rotate(5deg)" },
        },
        "heart-float": {
          "0%": { transform: "translateY(0) scale(0.8)", opacity: "0" },
          "10%": { opacity: "0.6" },
          "90%": { opacity: "0.6" },
          "100%": { transform: "translateY(-110vh) scale(1.2)", opacity: "0" },
        },
        "scroll-drift": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.6" },
          "50%": { transform: "translateY(8px)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "pop-in": "pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        twinkle: "twinkle 2s ease-in-out infinite",
        "petal-fall": "petal-fall 12s linear infinite",
        "welcome-pulse": "welcome-pulse 2s ease-in-out infinite",
        "heart-bounce": "heart-bounce 1.8s ease-in-out infinite",
        "heart-float": "heart-float 12s linear infinite",
        "scroll-drift": "scroll-drift 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
