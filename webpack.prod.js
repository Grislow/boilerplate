// webpack.prod.js - production builds
const LEGACY_CONFIG = 'legacy';
const MODERN_CONFIG = 'modern';

//__________________________________________________________
// node modules
//__________________________________________________________

// retrieve git information on build bundles
const git = require('git-rev-sync');
// for matching files with patterns
const glob = require('glob-all');
// mergin config files
const merge = require('webpack-merge');
// date library
const moment = require('moment');
const path = require('path');
const webpack = require('webpack');

//__________________________________________________________
// webpack plugins
//__________________________________________________________
// analyze bundle sizes in html format
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// cleans/removes build folders before building
const CleanWebpackPlugin = require('clean-webpack-plugin');
// used to symlink favicons to the root folder since thats where many browsers look
// you could probably ommit this
const CreateSymlinkPlugin = require('create-symlink-webpack-plugin');
// generate critical css
const CriticalCssPlugin = require('critical-css-webpack-plugin');
// creation of HTML fies
const HtmlWebpackPlugin = require('html-webpack-plugin');
// used to create .webp variants of all JPEG/PNG files that are imported in project
const ImageminWebpWebpackPlugin = require('imagemin-webp-webpack-plugin');
// for dynamic loading of css
// could be omitted in static build
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// optimize/minimize css assets
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
// used to get rid of unused css
const PurgecssPlugin = require('purgecss-webpack-plugin');
// used to download and save remote files locally
// -mostly for downloading and serving up google's analytics.js locally
const SaveRemoteFilePlugin = require('save-remote-file-webpack-plugin');
// minifies js
const TerserPlugin = require('terser-webpack-plugin');
// automatically generates progressive webpack plugins
const WebappWebpackPlugin = require('webapp-webpack-plugin');
// allows whitelisting css assets so they are not purged
const WhitelisterPlugin = require('purgecss-whitelister');
// generates complete service worker
// generates list of assets to precache that is injected into the serviceworker
const WorkboxPlugin = require('workbox-webpack-plugin');

//__________________________________________________________
// config files
//__________________________________________________________
const common = require('./webpack.common.js');
const pkg = require('./package.json');
const settings = require('./webpack.settings.js');

//__________________________________________________________
// Custom PurgeCSS extractor for Tailwind that allows special characters in
// class names.
//
// https://github.com/FullHuman/purgecss#extractor

class TailwindExtractor {
    static extract(content) {
        return content.match(/[A-Za-z0-9-_:\/]+/g) || [];
    }
}

//__________________________________________________________
// Configure file banner
//__________________________________________________________
//add information about project name, file name, author and git for each built file
const configureBanner = () => {
    return {
        banner: [
            '/*!',
            ' * @project        ' + settings.name,
            ' * @name           ' + '[filebase]',
            ' * @author         ' + pkg.author.name,
            ' * @build          ' + moment().format('llll') + ' ET',
            ' * @release        ' + git.long() + ' [' + git.branch() + ']',
            ' * @copyright      Copyright (c) ' + moment().format('YYYY') + ' ' + settings.copyright,
            ' *',
            ' */',
            ''
        ].join('\n'),
        raw: true
    };
};

//__________________________________________________________
// Configure Bundle Analyzer
//__________________________________________________________
// generate a HTML page report for bundles that allow exploring what is in the bundle
const configureBundleAnalyzer = (buildType) => {
    if (buildType === LEGACY_CONFIG) {
        return {
            analyzerMode: 'static',
            reportFilename: 'report-legacy.html',
        };
    }
    if (buildType === MODERN_CONFIG) {
        return {
            analyzerMode: 'static',
            reportFilename: 'report-modern.html',
        };
    }
};

//__________________________________________________________
// Configure Critical CSS
//__________________________________________________________
const configureCriticalCss = () => {
    // takes all the pages from settings files and maps over them
    return (settings.criticalCssConfig.pages.map((row) => {
            // checks the rendered test page which critical css will inspect
            const criticalSrc = settings.urls.critical + row.url;
            // output folder and filename 
            const criticalDest = settings.criticalCssConfig.base + row.template + settings.criticalCssConfig.suffix;

            //target height and width from settings file
            let criticalWidth = settings.criticalCssConfig.criticalWidth;
            let criticalHeight = settings.criticalCssConfig.criticalHeight;

            // Handle Google AMP templates
            if (row.template.indexOf(settings.criticalCssConfig.ampPrefix) !== -1) {
                criticalWidth = settings.criticalCssConfig.ampCriticalWidth;
                criticalHeight = settings.criticalCssConfig.ampCriticalHeight;
            }

            console.log("source: " + criticalSrc + " dest: " + criticalDest);
            return new CriticalCssPlugin({
                //your base dir
                base: './',
                //html src file - can be something like index.html
                src: criticalSrc,
                // output path
                dest: criticalDest,
                // do not remove inline styles from referenced html files
                extract: false,
                // do not use critical css built in inlining tool
                inline: false,
                // minify the critical css
                minify: true,
                // width of target viewport
                width: criticalWidth,
                // height of target viewport
                height: criticalHeight,
            })
        })
    );
};

//__________________________________________________________
// Configure Clean webpack
//__________________________________________________________
// deletes the dist folder before building
const configureCleanWebpack = () => {
    return {
        root: path.resolve(__dirname, settings.paths.dist.base),
        verbose: true,
        dry: false
    };
};

//__________________________________________________________
// Configure Html webpack
// -generates html for favicon
// -use this
//__________________________________________________________
const configureHtml = () => {
    return {
        templateContent: '',
        filename: 'webapp.html',
        inject: false,
    };
};

//__________________________________________________________
// Configure Image loader
// -minifies and loads your images(only those included in js)
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
                },
                {
                    loader: 'img-loader',
                    options: {
                        plugins: [
                            require('imagemin-gifsicle')({
                                interlaced: true,
                            }),
                            require('imagemin-mozjpeg')({
                                progressive: true,
                                arithmetic: false,
                            }),
                            require('imagemin-optipng')({
                                optimizationLevel: 5,
                            }),
                            require('imagemin-svgo')({
                                plugins: [
                                    {convertPathData: false},
                                ]
                            }),
                        ]
                    }
                }
            ]
        };
    }
};

//__________________________________________________________
// Configure optimization
// -this will only work for css imported in app.js
//__________________________________________________________
const configureOptimization = (buildType) => {
    if (buildType === LEGACY_CONFIG) {
        return {
            // checks for duplicated dependencies and removes them
            splitChunks: {
                cacheGroups: {
                    default: false,
                    common: false,
                    styles: {
                        name: settings.vars.cssName,
                        test: /\.(pcss|css|vue)$/,
                        chunks: 'all',
                        enforce: true
                    }
                }
            },
            minimizer: [
                // minimize js
                new TerserPlugin(
                    configureTerser()
                ),
                // minimize css
                new OptimizeCSSAssetsPlugin({
                    cssProcessorOptions: {
                        map: {
                            inline: false,
                            annotation: true,
                        },
                        safe: true,
                        discardComments: true
                    },
                })
            ]
        };
    }
    if (buildType === MODERN_CONFIG) {
        return {
            //minimize js, css is shared for legacy and modern, js isnt
            minimizer: [
                new TerserPlugin(
                    configureTerser()
                ),
            ]
        };
    }
};

//__________________________________________________________
// Configure Postcss loader
// -same as dev but with MiniCssExtractPlugin
// -this css needs to be imported in app entry point
//__________________________________________________________
const configurePostcssLoader = (buildType) => {
    if (buildType === LEGACY_CONFIG) {
        return {
            test: /\.(pcss|css)$/,
            use: [
                // extracts css into a bundle
                MiniCssExtractPlugin.loader,
                {
                    loader: 'css-loader',
                    options: {
                        importLoaders: 2,
                        sourceMap: true
                    }
                },
                {
                    loader: 'resolve-url-loader'
                },
                {
                    loader: 'postcss-loader',
                    options: {
                        sourceMap: true
                    }
                }
            ]
        };
    }
    // Don't generate CSS for the modern config in production, its already done for legacy
    if (buildType === MODERN_CONFIG) {
        return {
            test: /\.(pcss|css)$/,
            loader: 'ignore-loader'
        };
    }
};

//__________________________________________________________
// Configure PurgeCSS
//__________________________________________________________
const configurePurgeCss = () => {
    let paths = [];
    // where purgecss looks for css
    for (const [key, value] of Object.entries(settings.purgeCssConfig.paths)) {
        paths.push(path.join(__dirname, value));
    }

    return {
        paths: glob.sync(paths),
        // files that are whitelisted
        whitelist: WhitelisterPlugin(settings.purgeCssConfig.whitelist),
        // patterns that match files that are excluded
        whitelistPatterns: settings.purgeCssConfig.whitelistPatterns,
        extractors: [
            {
                //specifies where to extract css from and where to apply it
                extractor: TailwindExtractor,
                extensions: settings.purgeCssConfig.extensions
            }
        ]
    };
};

//__________________________________________________________
// Configure terser
//__________________________________________________________
//minimizes both legacy and modern js code
const configureTerser = () => {
    return {
        cache: true,
        parallel: true,
        sourceMap: true
    };
};

//__________________________________________________________
// Configure Webapp webpack
// -automates generation of manifest.json
// -works with HtmlWebpackPlugin to output webapp.html for inclusion in html's <head></head>
//__________________________________________________________
const configureWebapp = () => {
    return {
        logo: settings.webappConfig.logo,
        prefix: settings.webappConfig.prefix,
        cache: false,
        inject: 'force',
        favicons: {
            appName: pkg.name,
            appDescription: pkg.description,
            developerName: pkg.author.name,
            developerURL: pkg.author.url,
            path: settings.paths.dist.base,
        }
    };
};

//__________________________________________________________
// Configure Workbox service worker
// -configures WorkboxWebpackPlugin to generate a Service Worker for our website
//__________________________________________________________
const configureWorkbox = () => {
    let config = settings.workboxConfig;

    return config;
};


//__________________________________________________________
// Production module exports
//__________________________________________________________
module.exports = [
    merge(
        common.legacyConfig,
        {
            output: {
                filename: path.join('./js', '[name]-legacy.[chunkhash].js'),
            },
            mode: 'production',
            devtool: 'source-map',
            optimization: configureOptimization(LEGACY_CONFIG),
            module: {
                rules: [
                    configurePostcssLoader(LEGACY_CONFIG),
                    configureImageLoader(LEGACY_CONFIG),
                ],
            },
            plugins: [
                new CleanWebpackPlugin(settings.paths.dist.clean,
                    configureCleanWebpack()
                ),
                new MiniCssExtractPlugin({
                    path: path.resolve(__dirname, settings.paths.dist.base),
                    filename: path.join('./css', '[name].[chunkhash].css'),
                }),
                new PurgecssPlugin(
                    configurePurgeCss()
                ),
                new webpack.BannerPlugin(
                    configureBanner()
                ),
                //use this for injecting css and js into
                new HtmlWebpackPlugin(
                    configureHtml()
                ),
                new WebappWebpackPlugin(
                    configureWebapp()
                ),
                new CreateSymlinkPlugin(
                    settings.createSymlinkConfig,
                    true
                ),
                new SaveRemoteFilePlugin(
                    settings.saveRemoteFileConfig
                ),
                new BundleAnalyzerPlugin(
                    configureBundleAnalyzer(LEGACY_CONFIG),
                ),
            ].concat(
                configureCriticalCss()
            )
        }
    ),
    merge(
        common.modernConfig,
        {
            output: {
                filename: path.join('./js', '[name].[chunkhash].js'),
            },
            mode: 'production',
            devtool: 'source-map',
            optimization: configureOptimization(MODERN_CONFIG),
            module: {
                rules: [
                    configurePostcssLoader(MODERN_CONFIG),
                    configureImageLoader(MODERN_CONFIG),
                ],
            },
            plugins: [
                new webpack.optimize.ModuleConcatenationPlugin(),
                new webpack.BannerPlugin(
                    configureBanner()
                ),
                new ImageminWebpWebpackPlugin(),
                new WorkboxPlugin.GenerateSW(
                    configureWorkbox()
                ),
                new BundleAnalyzerPlugin(
                    configureBundleAnalyzer(MODERN_CONFIG),
                ),
            ]
        }
    ),
];