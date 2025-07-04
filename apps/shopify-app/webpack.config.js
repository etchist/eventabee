const { composePlugins, withNx } = require('@nx/webpack');
const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = composePlugins(withNx(), (config) => {
  config.target = 'node';
  config.entry = path.join(__dirname, 'src/main.ts');
  
  config.resolve = config.resolve || {};
  config.resolve.extensions = ['.ts', '.js'];
  
  config.externals = config.externals || [];
  
  // Don't bundle node_modules
  config.externalsPresets = { node: true };
  
  // Remove type checking plugin temporarily
  config.plugins = config.plugins.filter(
    plugin => !(plugin instanceof ForkTsCheckerWebpackPlugin)
  );
  
  return config;
});