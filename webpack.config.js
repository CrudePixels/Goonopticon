const path = require('path');

module.exports = {
    entry: {
        'sidebar.bundle': './JS/sidebar/main.js',
        'popup.bundle': './JS/popup.js',
        'background': './JS/background.js'
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'JS/bundle'),
        chunkFilename: '[name].js',
        publicPath: '', // Ensures all chunks load from the same directory
        clean: true
    },
    mode: 'production',
    devtool: process.env.NODE_ENV === 'production' ? false : 'source-map',
    cache: {
        type: 'filesystem',
    },
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
        minimize: false,
        moduleIds: 'named',
        chunkIds: 'named',
        usedExports: false,
        sideEffects: false,
    },
    experiments: {
        outputModule: false
    },
    target: 'web',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'JS')
        }
    },
    plugins: [
        new (require('webpack').optimize.LimitChunkCountPlugin)({
            maxChunks: 1
        })
    ],
    module: {
        rules: [
            {
                test: /\.txt$/i,
                type: 'asset/source',
            },
        ],
    }
};