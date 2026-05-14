/**
 * Manrope — dosyalar `assets/fonts` altında (Metro her ortamda çözer).
 * PostScript adları `expo-font` loadAsync ile aynı olmalı.
 */
export const manropeFontMap = {
  Manrope_400Regular: require('../../assets/fonts/Manrope_400Regular.ttf'),
  Manrope_500Medium: require('../../assets/fonts/Manrope_500Medium.ttf'),
  Manrope_600SemiBold: require('../../assets/fonts/Manrope_600SemiBold.ttf'),
  Manrope_700Bold: require('../../assets/fonts/Manrope_700Bold.ttf'),
} as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;
