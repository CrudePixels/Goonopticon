const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        background: './JS/background.js',
        popup: './JS/popup.js',
        'sidebar.bundle': './JS/sidebar/sidebar.js'
    },
    output: {
        path: path.resolve(__dirname, 'JS/bundle'),
        filename: '[name].js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: [
                            '@babel/plugin-transform-runtime',
                            '@babel/plugin-syntax-dynamic-import'
                        ]
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'themes',
                    to: 'themes'
                },
                {
                    from: 'manifest.json',
                    to: 'manifest.json'
                },
                {
                    from: 'Resources',
                    to: 'Resources'
                },
                {
                    from: 'CSS',
                    to: 'CSS'
                }
            ]
        })
    ],
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    chunks: 'all',
                },
                common: {
                    name: 'common',
                    minChunks: 2,
                    chunks: 'all',
                    enforce: true
                }
            }
        },
        usedExports: true,
        sideEffects: false
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'JS'),
            '@components': path.resolve(__dirname, 'JS/components'),
            '@utils': path.resolve(__dirname, 'JS/utils'),
            '@events': path.resolve(__dirname, 'JS/events'),
            '@config': path.resolve(__dirname, 'JS/config'),
            '@modals': path.resolve(__dirname, 'JS/modals'),
            '@storage': path.resolve(__dirname, 'JS/storage'),
            '@theme': path.resolve(__dirname, 'JS/theme')
        }
    },
    performance: {
        hints: 'warning',
        maxEntrypointSize: 300000,
        maxAssetSize: 300000
    }
};
