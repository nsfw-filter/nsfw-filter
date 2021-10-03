const path = require('path')
const glob = require('glob')
const CopyPlugin = require('copy-webpack-plugin')
const AntdDayjsWebpackPlugin = require('antd-dayjs-webpack-plugin')
const MiniCSSExtractPlugin = require('mini-css-extract-plugin')
const PurgeCSSPlugin = require('purgecss-webpack-plugin')

const PATHS = {
    src: path.join(__dirname, '../src'),
    dist: path.join(__dirname, '../dist/src')
}

module.exports = {
    entry: {
        content: `${PATHS.src}/content/content.ts`,
        background: `${PATHS.src}/background/background.ts`,
        popup: `${PATHS.src}/popup/index.tsx`,
    },
    output: {
        path: PATHS.dist,
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
                test: /\.(eot|png|svg|[ot]tf|woff2?)(\?v=\d+\.\d+\.\d+)?$/,
                loaders: ['file-loader']
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    "css-loader"
                ]
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: `${PATHS.src}/popup/popup.html`, to: PATHS.dist },
            ],
        }),
        new AntdDayjsWebpackPlugin(),
        new MiniCSSExtractPlugin({
            filename: "[name].css",
        }),
        new PurgeCSSPlugin({
            paths: glob.sync(`${PATHS.src}/**/*`,  { nodir: true }),
        }),
    ],
    resolve: {
        extensions: [".js", ".ts", ".tsx"]
    },
}
