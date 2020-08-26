const path = require('path')

const srcDir = '../src/'

module.exports = {
    entry: {
        content: path.join(__dirname, srcDir + 'content/content.ts'),
        background: path.join(__dirname, srcDir + 'background/background.ts'),
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
}
