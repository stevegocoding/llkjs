var Funnel                  = require('broccoli-funnel');
var mergeTrees              = require('broccoli-merge-trees');
var uglifyJavaScript        = require('broccoli-uglify-js');
var concatFiles             = require('broccoli-concat');

/******************************************************
 * Build Environment
 ******************************************************/
var env = process.env.BROCCOLI_ENV || 'development';

/******************************************************
 * Global
 *******************************************************/
var vendorTree = './vendor';
var gameTree = './js';
var assetsTree = './assets';

/******************************************************
 * Javascrpts Assets
 *******************************************************/
var gameFiles = [
  'game.js'
];
var vendorFiles = [
  'easeljs-0.8.0.min.js',
  'jquery-2.1.3.min.js',
  'underscore-min.js'
];

var gameJS = new Funnel(gameTree, {
  files: gameFiles
});

var assets = new Funnel(assetsTree);

var vendorJSFiles = new Funnel(vendorTree, {
  files: vendorFiles
});

var vendorJS = concatFiles(vendorJSFiles, {
  inputFiles: vendorFiles,
  outputFile: '/vendor.js'
});

gameJS = uglifyJavaScript(gameJS, {
  mangle: false,
  compress: false
});

module.exports = mergeTrees([gameJS, vendorJS, assets], {overwrite: true});
