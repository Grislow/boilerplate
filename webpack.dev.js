// webpack.dev.js - developmental builds
const LEGACY_CONFIG = 'legacy';
const MODERN_CONFIG = 'modern';

//__________________________________________________________
// node modules
//__________________________________________________________
const merge = require('webpack-merge');
const path = require('path');

// watches for changes in files
const sane = require('sane');
// to access built in webpack plugins
const webpack = require('webpack');

//__________________________________________________________
// webpack plugins
//__________________________________________________________

//cli dashboard for webpack dev server
const Dashboard = require('webpack-dashboard');
const DashboardPlugin = require('webpack-dashboard/plugin');
const dashboard = new Dashboard();

//__________________________________________________________
// config files
//__________________________________________________________
const common = require('./webpack.common.js');
const pkg = require('./package.json');
const settings = require('./webpack.settings.js');

//__________________________________________________________
// Configure the webpack-dev-server
//__________________________________________________________
const configureDevServer = (buildType) => {
    return {
        // where to serve assets from
        public: settings.devServerConfig.public(),
        // where to serve static content from
        contentBase: path.resolve(__dirname, settings.paths.templates),
        // host to use for dev server
        host: settings.devServerConfig.host(),
        // port to use for dev server
        port: settings.devServerConfig.port(),
        // whether to server over http / https
        https: !!parseInt(settings.devServerConfig.https()),
        // nothing except initial start-up information written to console
        quiet: true,
        // enables HMR
        hot: true,
        // HMR without refresh if build fails
        hotOnly: true,
        // shows error overlay in browser
        overlay: true,
        // specify what bundle information to show
        stats: 'errors-only',
        // control options related to watching files, poling can be sed if webpack fails
        watchOptions: {
            // !! makes sure its not undefined
            poll: !!parseInt(settings.devServerConfig.poll()),
            ignored: /node_modules/,
        },
        // adds header to all responses
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        // Use sane to monitor all of the templates files and sub-directories
        // before: executes custom middleware internally within server
        before: (app, server) => {
            const watcher = sane(path.join(__dirname, settings.paths.templates), {
                glob: ['**/*'],
                poll: !!parseInt(settings.devServerConfig.poll()),
            });
            watcher.on('change', function(filePath, root, stat) {
                console.log('  File modified:', filePath);
                server.sockWrite(server.sockets, "content-changed");
            });
        },
    };
};

//__________________________________________________________
// Configure Image loader
//  -this is only for assets imported into a js file
//__________________________________________________________
const configureImageLoader = (buildType) => {
    if (buildType === LEGACY_CONFIG) {
        return {
            test: /\.(png|jpe?g|gif|svg|webp)$/i,
            use: [
                {
                    loader: 'file-loader',
                    options: {
                        name: 'img/[name].[hash].[ext]'
                    }
                }
            ]
        };
    }
    if (buildType === MODERN_CONFIG) {
        return {
            test: /\.(png|jpe?g|gif|svg|webp)$/i,
            use: [
                {
                    loader: 'file-loader',
                    options: {
                        name: 'img/[name].[hash].[ext]'
                    }
                }
            ]
        };
    }
};

//__________________________________________________________
// Configure the Postcss loader
//__________________________________________________________
const configurePostcssLoader = (buildType) => {
    // Don't generate CSS for the legacy config in development
    if (buildType === LEGACY_CONFIG) {
        return {
            test: /\.(pcss|css)$/,
            loader: 'ignore-loader'
        };
    }
    if (buildType === MODERN_CONFIG) {
        return {
            test: /\.(pcss|css)$/,
            use: [
                // injects all CSS into document inline in <style></style> tags
                {
                    loader: 'style-loader',
                },
                // resolves all of our css @import and url()
                {
                    loader: 'css-loader',
                    options: {
                        importLoaders: 2,
                        sourceMap: true
                    }
                },
                // rewrites any url() in CSS to public path relative
                {
                    loader: 'resolve-url-loader'
                },
                // loads and processes files as PostCSS
                {
                    loader: 'postcss-loader',
                    options: {
                        sourceMap: true
                    }
                }
            ]
        };
    }
};
//__________________________________________________________
// Development module exports
//__________________________________________________________
//returning an array tells webpack that more then one compile needs to be done - legacy & modern
module.exports = [
    merge(
        common.legacyConfig,
        {
            //legacy files are name ...-legacy...
            output: {
                filename: path.join('./js', '[name]-legacy.[hash].js'),
                publicPath: settings.devServerConfig.public() + '/',
            },
            mode: 'development',
            devtool: 'inline-source-map',
            devServer: configureDevServer(LEGACY_CONFIG),
            module: {
                rules: [
                    configurePostcssLoader(LEGACY_CONFIG),
                    configureImageLoader(LEGACY_CONFIG),
                ],
            },
            plugins: [
                new webpack.HotModuleReplacementPlugin(),
            ],
        }
    ),
    merge(
        common.modernConfig,
        {
            output: {
                filename: path.join('./js', '[name].[hash].js'),
                publicPath: settings.devServerConfig.public() + '/',
            },
            mode: 'development',
            devtool: 'inline-source-map',
            devServer: configureDevServer(MODERN_CONFIG),
            module: {
                rules: [
                    configurePostcssLoader(MODERN_CONFIG),
                    configureImageLoader(MODERN_CONFIG),
                ],
            },
            plugins: [
                new webpack.HotModuleReplacementPlugin(),
                new DashboardPlugin(dashboard.setData),
            ],
        }
    ),
];