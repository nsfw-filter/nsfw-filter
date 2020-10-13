const merge = require('webpack-merge')
const common = require('./webpack.common.js')
const ChromeExtensionReloader = require('webpack-chrome-extension-reloader')

module.exports = merge(common, {
    devtool: 'inline-source-map',
    mode: 'development',
    watch: true,
    watchOptions: {
        ignored: ['node_modules/**']
    },
    plugins: [
        new ChromeExtensionReloader({
            port: 9090, // Which port use to create the server
            reloadPage: true, // Force the reload of the page also
        })
    ]
})
