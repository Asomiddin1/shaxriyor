// tamagui.config.ts
import { createTamagui } from '@tamagui/core'
import { config } from '@tamagui/config/v3'

// Slate palette (Tailwind) — dark mode uchun asosiy fon ranglari
const slate = {
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  950: '#020617',
}

// Dark theme'da gray shkalasi: 1 = eng to'q fon, 12 = eng och matn
const slateDarkGrays = {
  gray1: slate[900],
  gray2: '#131d33',
  gray3: slate[800],
  gray4: '#283548',
  gray5: slate[700],
  gray6: '#3e4c63',
  gray7: slate[600],
  gray8: slate[500],
  gray9: slate[400],
  gray10: slate[300],
  gray11: slate[200],
  gray12: slate[50],
}

// Простая и рабочая конфигурация
const appConfig = createTamagui({
  ...config,
  // Переопределяем только цвета
  themes: {
    ...config.themes,
    light: {
      ...config.themes.light,
      primary: '#2ECC71',
      primaryHover: '#27AE60',
      success: '#2ECC71',
      error: '#F44336',
      warning: '#FF9800',
    },
    dark: {
      ...config.themes.dark,
      // Slate fon ranglari
      background: slate[900],
      backgroundHover: slate[800],
      backgroundPress: '#283548',
      backgroundFocus: slate[800],
      backgroundStrong: slate[950],
      backgroundTransparent: 'rgba(15,23,42,0)',
      // Matn ranglari
      color: slate[200],
      colorHover: slate[100],
      colorPress: slate[300],
      colorFocus: slate[100],
      color12: slate[50],
      color11: slate[200],
      color10: slate[300],
      // Border ranglari
      borderColor: slate[700],
      borderColorHover: slate[600],
      borderColorPress: slate[500],
      borderColorFocus: slate[600],
      // Slate gray shkalasi
      ...slateDarkGrays,
      // Brand ranglari
      primary: '#2ECC71',
      primaryHover: '#58D68D',
      success: '#2ECC71',
      error: '#F44336',
      warning: '#FF9800',
    }
  }
})

export default appConfig

export type Conf = typeof appConfig

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}
