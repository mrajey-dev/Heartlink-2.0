// metro.config.js — Exclude backend directory from Metro file watching
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.blockList = [
  /backend\/.*/,
  /backend\\.*/,
];

if (!defaultConfig.resolver.assetExts.includes('ttf')) {
  defaultConfig.resolver.assetExts.push('ttf');
}
if (!defaultConfig.resolver.assetExts.includes('otf')) {
  defaultConfig.resolver.assetExts.push('otf');
}

module.exports = defaultConfig;
