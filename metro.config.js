// metro.config.js — Exclude backend directory from Metro file watching
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.blockList = [
  /backend\/.*/,
  /backend\\.*/,
];

module.exports = defaultConfig;
