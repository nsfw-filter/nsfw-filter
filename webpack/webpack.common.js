const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

const srcDir = '../src/'

module.exports = {
    entry: {
        content: path.join(__dirname, srcDir + 'content/content.ts'),
        background: path.join(__dirname, srcDir + 'background/background.ts'),
        popup: path.join(__dirname, srcDir + 'popup/index.tsx'),
    },
    output: {
        path: path.join(__dirname, '../dist/src'),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                exclude: /node_modules/,
                test: /\.scss$/,
                use: [
                    {
                        loader: "style-loader" // Creates style nodes from JS strings
                    },
                    {
                        loader: "css-loader" // Translates CSS into CommonJS
                    },
                    {
                        loader: "sass-loader" // Compiles Sass to CSS
                    }
                ]
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: path.join(__dirname, srcDir + 'popup/popup.html'), to: path.join(__dirname, '../dist/src') },
            ],
        }),
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
}
