const path = require('path');

module.exports = {
  entry: './JS/sidebar/main.js',
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, 'JS/sidebar'),
  },
  mode: 'production',
};