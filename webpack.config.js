const path = require('path');

module.exports = {
    entry: {
        'main.bundle': './JS/sidebar/main.js'
    },
    output: {
        filename: '[name].js',
        path: 'C:/Users/wolf0/OneDrive/Desktop/PodAwfulTimestamps/JS/sidebar/bundle',
        chunkFilename: '[name].js',
        publicPath: '', // Ensures all chunks load from the same directory
        clean: true
    },
    mode: 'production',
    devtool: false,
    cache: {
        type: 'filesystem',
    },
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
        minimize: true,
        minimizer: [
            '...', // Use default Terser
        ],
    },
    experiments: {
        // This disables output as a module, which can sometimes force chunking
        outputModule: false
    },
    plugins: [
        new (require('webpack').optimize.LimitChunkCountPlugin)({
            maxChunks: 1
        })
    ]
};