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
        offscreen: `${PATHS.src}/offscreen/offscreen.ts`,
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
                { from: `${PATHS.src}/offscreen/offscreen.html`, to: PATHS.dist },
                // TensorFlow.js WASM backend binaries, loaded via setWasmPaths()
                {
                    from: '*.wasm',
                    context: path.join(__dirname, '../node_modules/@tensorflow/tfjs-backend-wasm/dist'),
                    to: PATHS.dist
                },
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
        extensions: [".js", ".ts", ".tsx"],
        alias: {
            // nsfwjs pulls in @nsfw-filter/gif-frames -> ndarray, which generates
            // typed-array constructors with `new Function` at import time. That
            // violates the Manifest V3 CSP (no 'unsafe-eval') and aborts the
            // offscreen document before it can register its message listener.
            // We never call nsfwjs.classifyGif (GIFs are classified as their
            // static <img> frame via predictImage), so the dependency is dead
            // weight — stub it out to keep the eval-free CSP intact.
            "@nsfw-filter/gif-frames": path.resolve(__dirname, 'gif-frames-stub.js'),
            // tfjs pins seedrandom 2.4.x, whose main entry runs `(0,eval)('this')`
            // at load — another 'unsafe-eval' CSP violation that breaks the
            // offscreen document. Redirect bare `seedrandom` imports to an
            // eval-free shim exposing only alea (the one API tfjs uses). The `$`
            // keeps the shim's own `seedrandom/lib/alea` require working.
            "seedrandom$": path.resolve(__dirname, 'seedrandom-shim.js')
        }
    },
}
