const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @sentry/core v10 ships ESM with explicit .js extension imports that Metro
// cannot resolve without package exports support. Stub the entire package on
// web — Sentry RN is mobile-only and not needed in the browser dev environment.
const sentryWebStub = path.resolve(__dirname, 'src/mocks/sentry.web.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@sentry/react-native') {
    return { type: 'sourceFile', filePath: sentryWebStub };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
