const path = require('path')
const srcDir = '../src/'

module.exports = {
    entry: {
        types: path.join(__dirname, srcDir + 'types.ts'),
        utils: path.join(__dirname, srcDir + 'utils.ts'),
        content: path.join(__dirname, srcDir + 'content.ts'),
        background: path.join(__dirname, srcDir + 'background.ts')
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
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
}
