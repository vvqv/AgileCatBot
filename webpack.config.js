const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const NodemonPlugin = require('nodemon-webpack-plugin');
const port = 8000;

module.exports = (_env = {}, { mode }) => {
    const isProduction = mode === 'production';

    const plugins = [
        new NodemonPlugin({ delay: 1000 }),
        new Dotenv({
            path: './src/config/config.env', // load this now instead of the ones in '.env'
        }),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                diagnosticOptions: {
                    semantic: true,
                    syntactic: true,
                },
            },
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('development'),
        }),
    ];

    return {
        externalsPresets: { node: true },
        externals: [nodeExternals()],
        entry: './src/index',
        mode,
        devtool: isProduction ? 'source-map' : false,
        devServer: {
            historyApiFallback: false,
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            client: {
                overlay: false,
            },
            compress: true,
            port,
        },
        output: {
            path: path.join(__dirname, '/dist'),
            filename: 'main.js',
            libraryTarget: 'umd',
            globalObject: 'this',
            clean: true,
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
            modules: [path.resolve(__dirname, './src'), path.resolve(__dirname, './node_modules')],
            alias: {
                '@src': path.resolve(__dirname, 'src'),
                '@api': path.resolve(__dirname, 'src/api'),
                '@assets': path.resolve(__dirname, 'src/assets'),
                '@components': path.resolve(__dirname, 'src/components'),
                '@hooks': path.resolve(__dirname, 'src/hooks'),
                '@reducers': path.resolve(__dirname, 'src/reducers'),
                '@config': path.resolve(__dirname, 'src/config'),
                '@constants': path.resolve(__dirname, 'src/constants'),
                '@db': path.resolve(__dirname, 'src/db'),
                '@models': path.resolve(__dirname, 'src/models'),
                '@utils': path.resolve(__dirname, 'src/utils'),
                'package-json': path.resolve(__dirname, 'package.json'),
            },
        },
        module: {
            rules: [
                {
                    test: /\.(ts|tsx)?$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                    },
                },
                {
                    test: /\.svg$/,
                    use: ['@svgr/webpack'],
                },
                {
                    test: /\.(jpeg|jpg|png|gif)$/i,
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        name: 'assets/[hash:10].[ext]',
                    },
                },
            ],
        },
        plugins: plugins,
    };
};
