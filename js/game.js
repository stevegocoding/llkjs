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
      if (asset === undefined) {
        return _cache[name];
      }
      else {
        _cache[name] = asset;
      }
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
   * Have to use the constructor to extend easel.js objects
   *******************************************************/ 
  var TileDisplayObject = function(tile) {
    this.initialize(tile);
  };

  var super_p = createjs.DisplayObject.prototype;
  var p = TileDisplayObject.prototype = Object.create(super_p);
  p.constructor = TileDisplayObject;

  p._tile = null;

  p.initialize = function(tile) {
    super_p.initialize.apply(this, arguments);
    this._tile= tile;
  };
  
  p.srcXY = function() {
    var tilesAssetData = AssetsManager.cacheAsset('tiles_data');
    var sx = this._tile.gridXY().x * tilesAssetData.width;
    var sy = this._tile.gridXY().y * tilesAssetData.height;
    
    return {x: sx, y: sy};
  };

  /**
   * Overriden map drawing method
   * @param ctx
   * @param ignoreCache
   */
  p.draw = function(ctx, ignoreCache) {
    ctx.save();
    
    var img = AssetManager.cacheAsset('tilesheet'); 
    var tilesAssetData = AssetsManager.cacheAsset('tiles_data');
    var srcXY = this.srcXY(); 
    var destXY = this._tile.worldXY();

    this.drawTile(ctx, 
        img, 
        srcXY.x,
        srcXY.y,
        tilesAssetData.width
        tilesAssetData.height,
        destXY.x,
        destXY.y);

    ctx.restore();
  };
  
  p.drawTile = function(ctx, img, x, y, w, h, dx, dy) {
    ctx.drawImage(img, x, y, w, h, dx, dy); 
  };
  
  
  /********************************************************
   * The Tile Entity
   *  - This is the prototype object of all tiles entities
   *******************************************************/
  Tile = (function() {
    var exp = {}; 

    /*
       TileEntityData: 
       {
         "gridX" --- grid coordinates on board
         "gridY"
         
         "typeID" --- the id of the tile's type, 0 for empty/dummy tile 
       }
     */ 
    
    exp.init = function(boardData, tileData) {
      this._boardData = boardData;
      this._tileData = tileData; 
      this._displayObject = new TileDisplayObject(tileData);
    };
    
    exp.gridXY = function(x, y) { 
      if (gridY === undefined && y === undefined) {
        return {x: this._tileData.gridX, y: this._tileData.gridY};
      }
      this._tileData.gridX = gridX; 
      this._tileData.gridY = gridY;
      updateWorldPos();
    };
    
    exp.worldXY = function() {
      return {x: this._worldX, y: this._worldY);
    };
    
    exp.addToStage = function(stage) {
      stage.addChild(this._displayObject);
    }; 
    
    exp.updateWorldPos = function() {
      this._worldX = this._baordData.worldX + this._tileData._gridX * this._tileData.tileSize; 
      this._worldY = this._baordData.worldY + this._tileData._gridY * this._tileData.tileSize; 
    };

    return exp; 
  }());
  
  /********************************************************
   * The Board Entity
   *  - Manage all the tiles on the board
   *  - Implement the matching algorithm
   *******************************************************/
  Board = (function() {
    var exp = {}; 
    
    /** 
        BoardEntityData: 
        {
         "worldX" --- the absolute x coords in the world 
         "worldY" 
         
         "grid" --- An array of cells, each element is tile's type ID
        }
     */

    exp.init = function(boardData) { 
      var numTiles = boardData.numTiles * boardData.numTiles;
      this._boardData = boardData;
     
      // Pre-allocate the arrays
      this._tiles = [];
      this._grid = []; 
      this._tiles.length = numTiles;
      this._grid.length = numTiles; 
    };
    
    exp.grid = function() {
      return this._boardData.grid;
    };
    
    exp.setTile = function(tile, x, y) {   
      this._tiles[y * this._boardData.numTiles + x] = tile; 
    }; 

    return var; 
  }());
  
  /********************************************************
   * The Tile Factory for tiles creation 
   *******************************************************/
  Factory = (function() {
    var exp = {}; 

    exp.createTile = function(tileAsset, defaultData) { 
      
    }
    
    exp.createBoard = function(boardAsset, defaultData) {
      
    }
    
    return exp;
  }());


  
  /********************************************************
   * The Game Module
   *   - Handles the game states
   *   - Using some app-level modules such as assets manager
   *******************************************************/
  Game = (function() {
    var exp = {};
    
    /** Module's Private Variables */
    var _stage;
    var _curStat;
    var _states = {};
    var _assetManifest = 'assets/assets.json';
    
    var _board;
    var _tiles = [];
    
    /** Module's Private Methods */ 
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
      
      // Create the board 
      var boardAssetData = AssetManager.cacheAsset('board_data');
      _board = Factory.createBoard(boardAssetData);
      
      // Create the tiles
      var tilesAssetData = AssetManager.cacheAsset('tiles_data'); 
      var grid = _board.grid();
      
      _.each(grid, function(cell, idx, list) {
        var x = idx % boardAssetData.num_tiles;
        var y = idx / boardAssetData.num_tiles;
        var tileData = {
          gridX: x,
          gridY: y,
          typeID: grid[idx]
        };
        var tile = Factory.createTile(tileData); 
        _tiles.push(tile); 
        _board.setTile(tile, x, y);
      });
    };
    
    exp.start = function() {
      createjs.Ticker.timingMode = createjs.Ticker.RAF;
      createjs.Ticker.addEventListener("tick", _stage);
    }

    exp.stage = function() {
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
    
    //var stage = Game.stage(); 
    
    /* 
    var testObj = new TileDisplayObject('assets/tiles.png'); 
    testObj.x = 100;
    testObj.y = 100;
    
    stage.addChild(testObj); 

    */
  });
  
}(window, window.jQuery, window._, window.createjs));
