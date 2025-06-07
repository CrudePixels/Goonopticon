const path = require('path');

module.exports = {
  entry: {
    'main.bundle': './JS/sidebar/main.js'
  },
  output: {
    filename: '[name].js',
    path: 'C:/Users/wolf0/OneDrive/Desktop/PodAwfulTimestamps/JS/sidebar/bundle',
    chunkFilename: '[name].js',
    clean: true
  },
  mode: 'production',
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  }
};