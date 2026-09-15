/* global require, module, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Metro loads this configuration in Node. */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const empty = path.resolve(__dirname, 'src/empty-module.js');
// The SDK contains a dynamic Node `ws` fallback that Metro still resolves.
// React Native supplies its own WebSocket; never bundle the Node implementation.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/native-websocket.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('readable-stream'),
  ...Object.fromEntries(
    [
      'crypto',
      'http',
      'https',
      'net',
      'tls',
      'zlib',
      'os',
      'dns',
      'assert',
      'url',
      'path',
      'fs',
    ].map((name) => [name, empty]),
  ),
};
module.exports = config;
