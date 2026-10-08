/* global require, module, __dirname */
/* eslint-disable @typescript-eslint/no-require-imports -- Metro loads this configuration in Node. */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const empty = path.resolve(__dirname, 'src/empty-module.js');
const metamaskPackageDir = path.dirname(
  require.resolve('@metamask/connect-evm'),
);
const dappClient = require.resolve(
  '@metamask/mobile-wallet-protocol-dapp-client',
  { paths: [metamaskPackageDir] },
);
// MetaMask's protocol core has both index.js and index.mjs, but its package
// entry points to index.js. Metro's lazy chunk URL omits the extension; prefer
// .js so the chunk defines the same module ID as the dynamic import.
config.resolver.sourceExts = [
  'js',
  ...config.resolver.sourceExts.filter((extension) => extension !== 'js'),
];
// The SDK contains a dynamic Node `ws` fallback that Metro still resolves.
// React Native supplies its own WebSocket; never bundle the Node implementation.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Its ESM export targets index.mjs while Metro's extensionless lazy URL
  // resolves index.js. Use one file for both sides of the dynamic import.
  if (moduleName === '@metamask/mobile-wallet-protocol-dapp-client') {
    return { type: 'sourceFile', filePath: dappClient };
  }
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
