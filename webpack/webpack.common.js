const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

const srcDir = '../src/'

module.exports = {
    entry: {
        content: path.join(__dirname, srcDir + 'content/content.ts'),
        background: path.join(__dirname, srcDir + 'background/background.ts'),
        popup: path.join(__dirname, srcDir + 'popup/popup.ts'),
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
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, srcDir + 'popup/popup.html'),
                    to: path.join(__dirname, '../dist/src/popup.html'),
                },
                {
                    from: path.join(__dirname, srcDir + 'popup/popup.css'),
                    to: path.join(__dirname, '../dist/src/popup.css'),
                },
            ],
        }),
    ]
}
