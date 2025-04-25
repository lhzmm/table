const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')

function resolve(relativePath) {
    return path.resolve(__dirname, relativePath)
}

module.exports = {
    mode:'development',
    entry: {
        main: resolve('./src/main.js')
    },
    output: {
        filename: '[name].js',
        path: resolve('./dist'),
    },
    module: {
        rules: [
            { test: /\.js$/, loader: 'babel-loader',exclude:/node_modules/ },
            { test: /\.vue$/, loader: 'vue-loader' },
            {
                test: /\.less$/,
                use: [
                    'vue-style-loader',
                    'css-loader',
                    {loader:'less-loader'}
                ]
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ]
            },
            {
                test:/\.(ttf|woff|png)$/,
                use:['file-loader']
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.vue'],
    },
    plugins: [
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            template:resolve('./public/index.html')
        })
    ],
    devServer:{
        host:'127.0.0.1',
        open:true,
        port:'8099',
        hot:true,
    },
    devtool:"source-map"
}