// src/utils/responsive.js — App-wide Responsive & Uniform Mobile Scaling System
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Standard mobile baseline dimensions (iPhone 11/12/13/14 / standard Android device width)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Linear scale based on screen width. Use for horizontal padding, margins, card widths.
 */
export const scale = (size) => {
  return Math.round(PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size));
};

/**
 * Linear scale based on screen height. Use for vertical heights, top/bottom margins.
 */
export const verticalScale = (size) => {
  return Math.round(PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size));
};

/**
 * Moderate scale with factor. Excellent for font sizes, border radii, icons.
 * Ensures small screens don't get tiny text and large screens (430dp+) don't blow up text size.
 */
export const moderateScale = (size, factor = 0.5) => {
  const scaled = scale(size);
  return Math.round(PixelRatio.roundToNearestPixel(size + (scaled - size) * factor));
};

/**
 * Responsive Font Size. Alias for moderateScale with factor = 0.4 for ideal readability across all phones.
 */
export const fs = (size) => {
  return moderateScale(size, 0.4);
};

/**
 * Width percentage of screen width.
 */
export const wp = (percentage) => {
  return Math.round((percentage * SCREEN_WIDTH) / 100);
};

/**
 * Height percentage of screen height.
 */
export const hp = (percentage) => {
  return Math.round((percentage * SCREEN_HEIGHT) / 100);
};

export const FONT_SIZE = {
  xs: fs(10),
  sm: fs(12),
  md: fs(14),
  lg: fs(16),
  xl: fs(18),
  xxl: fs(22),
  title: fs(26),
  header: fs(30),
  hero: fs(36),
};

export const ICON_SIZE = {
  xs: scale(14),
  sm: scale(18),
  md: scale(22),
  lg: scale(26),
  xl: scale(32),
  xxl: scale(40),
};

export const SPACING = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(24),
  xxl: scale(32),
};

export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isSmallDevice: SCREEN_WIDTH < 360,
  isTablet: SCREEN_WIDTH >= 600,
};
