
//__________________________________________________________
// WEBPACK SETTINGS
//  -data that changes from project to project
//__________________________________________________________
require('dotenv').config();

module.exports = {
    name: "My Project Name",
    copyright: "The Project Company, Ltd.",
    paths: {
        src: {
            base: "./src/",
            css: "./src/css/",
            js: "./src/js/"
        },
        dist: {
            // where production ready files are outputted
            base: "./web/dist/",
            clean: [
                "./img",
                "./criticalcss",
                "./css",
                "./js"
            ]
        },
        // where the dev server takes static files from
        templates: "./templates/"
    },
    urls: {
        // production
        live: "https://example.com/",
        // local test
        local: "http://example.test/",
        // what criticalcss inspects
        critical: "http://example.test/",
        // path for static content
        publicPath: "/dist/"
    },
    vars: {
        // name of the main css import statement
        cssName: "styles"
    },

    //entry point of app, one for SPA, several for traditional
    //simplifying: a <script src="app.js"></script> for bootstrapping JS
    //most js in this build gets imported dynamically hence only one script tag needed
    entries: {
        "app": "app.js"
    },

    //specifes files that should be coppied for usage when routes fail to generate a response
    copyWebpackConfig: [
        {
            from: "./src/js/workbox-catch-handler.js",
            to: "js/[name].[ext]"
        }
    ],

    //allows generating critical css seperatly
    criticalCssConfig: {
        //base ouput folder
        base: "./web/dist/criticalcss/",
        // appended to each critical css file
        suffix: "_critical.min.css",
        // target height of viewport
        criticalHeight: 1200,
        // target width of viewport
        criticalWidth: 1200,
        // these are setitngs for google amp
        ampPrefix: "amp_",
        ampCriticalHeight: 19200,
        ampCriticalWidth: 600,
        pages: [
            {
                // this is a path("" = "/" , "offline" = "/offline"), not the actual url
                url: "",
                template: "index"
            }
        ]
    },

    // different setting for the development server environment
    // used in webpack dev 
    devServerConfig: {
        // if values not found in .env file, revert to default

        // base path for all assets
        public: () => process.env.DEVSERVER_PUBLIC || "http://localhost:8080",
        host: () => process.env.DEVSERVER_HOST || "localhost",
        poll: () => process.env.DEVSERVER_POLL || false,
        port: () => process.env.DEVSERVER_PORT || 8080,
        https: () => process.env.DEVSERVER_HTTPS || false,
    },

    manifestConfig: {
        basePath: ""
    },
    purgeCssConfig: {
        // files/folders that are checked for used css, the rest is discarded
        paths: [
            "./templates/**/*.{twig,html}",
            "./src/vue/**/*.{vue,html}"
        ],
        // files, folders that should be whitelisted
        whitelist: [
            "./src/css/components/**/*.{css,pcss}"
        ],
        // use patterns instead of filepaths
        whitelistPatterns: [],
        // files that should be checked for css
        extensions: [
            "html",
            "js",
            "twig",
            "vue"
        ]
    },
    saveRemoteFileConfig: [
        {
            url: "https://www.google-analytics.com/analytics.js",
            filepath: "js/analytics.js"
        }
    ],
    createSymlinkConfig: [
        {
            origin: "img/favicons/favicon.ico",
            symlink: "../favicon.ico"
        }
    ],
    webappConfig: {
        logo: "./src/img/favicon-src.png",
        prefix: "img/favicons/"
    },
    workboxConfig: {
        swDest: "../sw.js",
        precacheManifestFilename: "js/precache-manifest.[manifestHash].js",
        importScripts: [
            "/dist/workbox-catch-handler.js"
        ],
        exclude: [
            /\.(png|jpe?g|gif|svg|webp)$/i,
            /\.map$/,
            /^manifest.*\\.js(?:on)?$/,
        ],
        globDirectory: "./web/",
        globPatterns: [
            "offline.html",
            "offline.svg"
        ],
        offlineGoogleAnalytics: true,
        runtimeCaching: [
            {
                urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
                handler: "cacheFirst",
                options: {
                    cacheName: "images",
                    expiration: {
                        maxEntries: 20
                    }
                }
            }
        ]
    }
};