//__________________________________________________________
// WEBPACK COMMON
//  -do not change from project to project
//  -common for both dev and prod build
//__________________________________________________________
const LEGACY_CONFIG = 'legacy';
const MODERN_CONFIG = 'modern';

//__________________________________________________________
// node modules
//__________________________________________________________
// utility used to get the absolute path of some files
const path = require('path');
// allows merging serveral webpack config files into one
const merge = require('webpack-merge');

//__________________________________________________________
// webpack plugins
//__________________________________________________________

//copies files and dirs to build dir
const CopyWebpackPlugin = require('copy-webpack-plugin');

//generates an asset manifest file
const ManifestPlugin = require('webpack-manifest-plugin');

//displays build status system notifications
const WebpackNotifierPlugin = require('webpack-notifier');

//__________________________________________________________
// config files
//__________________________________________________________

//loading some data from package.json, example: browsersList, name
const pkg = require('./package.json');
//loading project specific setting for: entry points
const settings = require('./webpack.settings.js');

//__________________________________________________________
// configure babel loader
//__________________________________________________________
//takes browserList as argument so it can be specified dynamically for legacy vs modern browsers
const configureBabelLoader = (browserList) => {
    return {
        //catches all js,jsx,ts,tsx files
        test: /\.(js|jsx|ts|tsx)$/,
        //exludes any file within the node_modules directory
        exclude: /node_modules/,
        use: {
            loader: 'babel-loader',
            options: {
                presets: [
                    //[!] '@babel/preset-react',
                    [
                        // used in place of .babelrc
                        '@babel/preset-env', {
                            //does not transform es6 modules to other module types
                            modules: false,
                            //replaces @babel/polyfill with individual polyfill requirements based on environment
                            useBuiltIns: 'entry',

                            // prints out in console that targets and plugins used
                            // "debug": true,

                            //desribes environments the project should support
                            targets: {
                                browsers: browserList,
                        },
                    }
                    ],
                ],
                plugins: [
                    //allows loading js modules asynchronously and dynamically when needed
                    // - import() statements are treated as split points, meaning they generate seperate bundles which are loaded when needed
                    //you can now import(/* webpackChunkName: "my-chunk-name" */ /* webpackMode: "lazy" */ 'module')
                    '@babel/plugin-syntax-dynamic-import',
                    [
                        // enables reuse of Babel's injected helper code to reduce codesize
                        "@babel/plugin-transform-runtime", {
                        //allows usage of regenarator runtime without polluting global scope
                        "regenerator": true
                    }
                    ]
                ],
            },
        },
    };
};

//__________________________________________________________
// configure Entries
//  -takes entries from webpack.settings.js and prepends filepath to the filename
//  -simpliy <script ...></script> that will be included in your HTML
//__________________________________________________________
const configureEntries = () => {
    let entries = {};
    for (const [key, value] of Object.entries(settings.entries)) {
        entries[key] = path.resolve(__dirname, settings.paths.src.js + value);
    }
    return entries;
};

//__________________________________________________________
// Configure Font loader
//  -font loading common for dev and prod
//__________________________________________________________
const configureFontLoader = () => {
    return {
        test: /\.(ttf|eot|woff2?)$/i,
        use: [
            {
                loader: 'file-loader',
                options: {
                    name: 'fonts/[name].[ext]'
                }
            }
        ]
    };
};

//__________________________________________________________
// Configure Manifest
// -configures automatic creation of the asset manifest file through webpack-manifest-plugin
//__________________________________________________________
const configureManifest = (fileName) => {
    return {
        fileName: fileName,
        basePath: settings.manifestConfig.basePath,
        map: (file) => {
            file.name = file.name.replace(/(\.[a-f0-9]{32})(\..*)$/, '$2');
            return file;
        },
    };
};

//__________________________________________________________
// Base webpack config
//__________________________________________________________
const baseConfig = {
    // project name from package.json
    name: pkg.name,
    entry: configureEntries(),
    output: {
        path: path.resolve(__dirname, settings.paths.dist.base),
        publicPath: settings.urls.publicPath
    },
    module: {
        rules: [
            configureFontLoader()
        ],
    },
    plugins: [
        //shows build status notifications 
        new WebpackNotifierPlugin({title: 'Webpack', excludeWarnings: true, alwaysNotify: true})
    ]
};

//__________________________________________________________
// Legacy webpack config
//__________________________________________________________
const legacyConfig = {
    module: {
        rules: [
            configureBabelLoader(Object.values(pkg.browserslist.legacyBrowsers)),
        ],
    },
    plugins: [
        new CopyWebpackPlugin(
            settings.copyWebpackConfig
        ),
        new ManifestPlugin(
            configureManifest('manifest-legacy.json')
        ),
    ]
};

//__________________________________________________________
// Modern webpack config
//__________________________________________________________
const modernConfig = {
    module: {
        rules: [
            configureBabelLoader(Object.values(pkg.browserslist.modernBrowsers)),
        ],
    },
    plugins: [
        new ManifestPlugin(
            configureManifest('manifest.json')
        ),
    ]
};

//__________________________________________________________
// Common module exports
//__________________________________________________________
module.exports = {
    'legacyConfig': merge(
        legacyConfig,
        baseConfig
    ),
    'modernConfig': merge(
        modernConfig,
        baseConfig
    ),
};