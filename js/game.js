(function(window, $, _, createjs) {
  /********************************************************
   * Utility Functions
   *******************************************************/
  function loadImage(url) {
    function _loadImg(deferred) {
      var image = new Image();

      image.onload = loaded;
      image.onerror = errored; 
      image.onabort = errored; 
      image.src = url;

      function loaded() {
        unbindEvents();
        deferred.resolve(image);
      }
      function errored() {
        unbindEvents();
        deferred.reject(image);
      }
      function unbindEvents() {
        image.onload = null;
        image.onerror = null;
        image.onabort = null;
      }
    };
    return $.Deferred(_loadImg).promise();
  };
  
  
  /********************************************************
   * AssetsManager Module
   *   - Handles the game states
   *   - Using some global modules such as assets manager
   *******************************************************/
  AssetsManager = (function() {
    var exp = {};
    
    var _cache = {};
    var _assetRootPath;
    var _numAssets = 0;
    var _isFinished = false;
    
    function cacheAsset(name, asset) {
      _cache[name] = asset;
    }
    
    function getManifestBundle(bundle) {
      _.each(bundle.content, function(asset, idx, list) { 
        $.ajax({ 
          url: _assetRootPath + asset.path,
          type: 'GET',
          dataType: 'JSON'
        })
        .done(function(data) {
          console.log('Json asset loading OK!');
          cacheAsset(data.name, data); 
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          console.log('Json asset loading FAILED! - ' + errorrThrown);
        });
      });
    }
    
    function getImagesBundle(bundle) {
      _.each(bundle.content, function(asset, idx, list) { 
        loadImage(_assetRootPath + asset.path)
        .done(function(image) {
          console.log('Image loading OK! --- ' + image.src); 
          cacheAsset(asset.name, image);
        })
        .fail(function() {
          console.log('Image loading FAILED! --- ' + image.src);
        });
      });
    }
    
    exp.downloadAll = function(manifestPath) {
      // Get the manifest first
      $.ajax({
        url: manifestPath,
        type: 'GET',
        dataType: 'JSON'
      })
      .done(function (manifestData) {
        console.log('Manifest file download - OK!');
        
        _assetRootPath = manifestData.root_path;
        
        var bundles = manifestData.bundles; 
        _.each(bundles, function(bundle, idx, list) {
          _numAssets = _numAssets + bundle.content.length;
        });
        _.each(bundles, function(bundle, idx, list) {
          if (bundle.name === 'manifests') { 
            getManifestBundle(bundle);
          }
          else if (bundle.name === 'imgs') { 
            getImagesBundle(bundle); 
          } 
        });
      })
      .fail(function () {
        console.log('Manifest file download - Error!');
      });
    };

    return exp;
  }());
  
  
  /********************************************************
   * TileDisplayObject, inheriting easel.js DisplayObject 
   * for tiled sheet rendering 
   * 
   *******************************************************/ 
  var TileDisplayObject = function(tileData) {
    this.initialize(tileData);
  };

  var super_p = createjs.DisplayObject.prototype;
  var p = TileDisplayObject.prototype = Object.create(super_p);
  p.constructor = TileDisplayObject;

  p.initialize = function(tileData) {
    super_p.initialize.apply(this, arguments);
    this._tileData = tileData;
  };

  /**
   * Overriden map drawing method
   * @param ctx
   * @param ignoreCache
   */
  p.draw = function(ctx, ignoreCache) {
    
  };

  
  /********************************************************
   * The Game Module
   *   - Handles the game states
   *   - Using some app-level modules such as assets manager
   *******************************************************/
  Game = (function() {
    var exp = {};
    
    /** Private Variables */
    var _staage;
    var _curStat;
    var _states = {};
    var _assetManifest = 'assets/assets.json';
    
    /** Private Methods */ 
    function _regState(name, startFunc, procesFunc, exitFunc) { 
      _states[name] = {
        'onStart': startFunc,
        'onProcess': processFunc, 
        'onExit': exitFunc
      }
    }

    /** Public Interfaces */ 
    exp.init = function(canvas) {
      _stage = new createjs.Stage(canvas);
    };

    exp.getStage = function() {
      return _stage;
    }

    return exp;
  })();

  function initGame() {
    // Download all the assets
    AssetsManager.downloadAll('assets/assets.json');
    
    // Init the canvas
    canvasDom = $('#game-canvas')[0];
    Game.init(canvasDom);
  }
  
  $(function() {
    // DOM is ready! 
    
    // Init the Game
    initGame();
    
    //var stage = Game.getStage(); 
    
    /* 
    var testObj = new TileDisplayObject('assets/tiles.png'); 
    testObj.x = 100;
    testObj.y = 100;
    
    stage.addChild(testObj); 

    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", stage);
    */
  });
}(window, window.jQuery, window._, window.createjs));

