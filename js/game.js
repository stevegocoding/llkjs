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
    return $.Deferred(_loadImg);
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
      var deferreds = [];
      _.each(bundle.content, function(asset, idx, list) { 
        var def = $.ajax({ 
          url: _assetRootPath + asset.path,
          type: 'GET',
          dataType: 'JSON'
        })
        .done(function(data) {
          console.log('Json asset loading OK!');
          if (data instanceof Array) { 
            _.each(data, function(e) { 
              cacheAsset(e.name, e);
            });
          }
          else {
            cacheAsset(data.name, data); 
          }
        });
        def.fail(function(jqXHR, textStatus, errorThrown) {
          console.log('Json asset loading FAILED! - ' + errorrThrown);
        });
        deferreds.push(def);
      });
      return deferreds;
    }
    
    function getImagesBundle(bundle) {
      var deferreds = [];
      _.each(bundle.content, function(asset, idx, list) { 
        var def = loadImage(_assetRootPath + asset.path)
        .done(function(image) {
          console.log('Image loading OK! --- ' + image.src); 
          cacheAsset(asset.name, image);
        }); 
        def.fail(function() {
          console.log('Image loading FAILED! --- ' + image.src);
        });
        deferreds.push(def);
      });
      return deferreds;
    }
    
    exp.cacheAsset = function(name) {
      return cacheAsset(name);
    }
    
    exp.downloadManifest = function(manifestPath) {
      // Get the manifest first
      return $.when($.ajax({
        url: manifestPath,
        type: 'GET',
        dataType: 'JSON'
      }));
    }; 

    exp.downloadBundles = function(manifestData) { 
      var deferreds = [];
      
      _assetRootPath = manifestData.root_path;
      var bundles = manifestData.bundles; 
      _.each(bundles, function(bundle, idx, list) {
        _numAssets = _numAssets + bundle.content.length;
      });
      
      _.each(bundles, function(bundle, idx, list) {
        if (bundle.name === 'manifests') { 
          deferreds = deferreds.concat(getManifestBundle(bundle));
        }
        else if (bundle.name === 'imgs') { 
          deferreds = deferreds.concat(getImagesBundle(bundle));
        } 
      }); 
      return deferreds;
    }; 

    return exp;
  }());
  
  
  /********************************************************
   * TileDisplayObject, inheriting easel.js DisplayObject 
   * for tiled sheet rendering 
   * 
   * Have to use the constructor to extend easel.js objects :((((((
   *******************************************************/ 
  var TileDisplayObject = function(tile) {
    this.initialize(tile);
  };

  var super_p = createjs.DisplayObject.prototype;
  var p = TileDisplayObject.prototype = new createjs.DisplayObject();
  p.constructor = TileDisplayObject;

  p._tile = null;

  p.initialize = function(tile) {
    this._tile= tile;
  };
  
  p.srcXY = function() {
    var tilesAssetData = AssetsManager.cacheAsset(this._tile.assetName());
    var sx = tilesAssetData.x;
    var sy = tilesAssetData.y;
    
    return {x: sx, y: sy};
  };

  /**
   * Overriden map drawing method
   * @param ctx
   * @param ignoreCache
   */
  p.draw = function(ctx, ignoreCache) {
    ctx.save();
    
    var img = AssetsManager.cacheAsset('tilesheet'); 
    var tilesAssetData = AssetsManager.cacheAsset(this._tile.assetName());
    var srcXY = this.srcXY(); 
    var destXY = this._tile.worldXY();

    this.drawTile(ctx, 
        img, 
        srcXY.x,
        srcXY.y,
        tilesAssetData.width,
        tilesAssetData.height,
        destXY.x,
        destXY.y);

    ctx.restore();
  };
  
  p.drawTile = function(ctx, img, x, y, w, h, dx, dy) {
    ctx.drawImage(img, x, y, w, h, dx, dy, w, h); 
  };
  
  p.tile = function() { 
    return this._tile;
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
         "assetName" 
         "gridX" --- grid coordinates on board
         "gridY"
         
         "typeID" --- the id of the tile's type, 0 for empty/dummy tile 
       }
     */ 
    
    exp.init = function(boardData, tileData) {
      this._boardData = boardData;
      this._tileData = tileData; 
      this._displayObject = new TileDisplayObject(this);
    };
    
    exp.gridXY = function(x, y) { 
      if (x === undefined && y === undefined) {
        return {x: this._tileData.gridX, y: this._tileData.gridY};
      }
      this._tileData.gridX = x; 
      this._tileData.gridY = y;
      this.updateWorldPos();
    };
    
    exp.worldXY = function() {
      return {x: this._worldX, y: this._worldY};
    };
    
    exp.addToStage = function(stage) {
      stage.addChild(this._displayObject);
    }; 
    
    exp.updateWorldPos = function() {
      this._worldX = this._boardData.worldX + this._tileData.gridX * (this._tileData.width + this._boardData.gapX); 
      this._worldY = this._boardData.worldY + this._tileData.gridY * (this._tileData.height + this._boardData.gapY); 
    };
   
    exp.assetName = function() {
      return this._tileData.assetName;
    };
    
    exp.typeID = function() {
      return this._tileData.typeID;
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
    
    var dirs = [ [0, 1], [1, 0], [0, -1], [-1, 0] ];
    var found = false;
    
    function tileType(grid, x, y) { 
      return grid[y][x];
    }

    function isTileWalkable(grid, x, y) { 
      return tileType(grid, x, y) == 0; 
    }
    
    /** 
     * A Depth-First-Search algorithm that finds if there is 
     * any path between two points in a grid that has NO MORE THAN 2
     * re-directions.
     * 
     * Params: 
     *    x - current grid x coord
     *    y - current grid y coord
     *    dx - destination grid x coord
     *    dy - destination grid y coord
     *    dir - the direction taken when moving from previous cell to current one 
     *    numRedir - current number of re-directions
     *    path - an array that keeps track of the searching path 
     */    
    function dfs(grid, x, y, dx, dy, dir, numRedir, path) {
      if (found || numRedir > 2) { 
        return;
      }
      
      if (x === dx && y === dy) { 
        found = true; 
        return; 
      }
      
      // Try all 4 directions from current cell
      for (var i = 0; i < 4; ++i) {
        // Get next cell coords nx, ny based on direction
        var nx = x + dirs[i][0];
        var ny = y + dirs[i][1];
        
        // Direction of next step
        var nd = i; 
        
        // Store next cell in the path
        path.push({x: nx, y: ny});
        
        // if next tile has the same type as current one,
        // we may find a solution
        if (tileType(grid, nx, ny) === tileType(grid, dx, dy)) {

          // If the next step's direction is differen from the current one, then 
          // increase one 
          if (dir !== -1 && nd !== dir) { 
            numRedir++; 
          }  
          // We found a path
          if (nx === dx && ny === dy && numRedir <= 2) {
            found = true;
            return;
          }
        }
        
        // The adjensent tile is not dest tile yet, keep searching deeper
        if (isTileWalkable(grid, nx, ny)) {
          if (dir != -1 && nd != dir) {
            numRedir++; 
          }
          if (numRedir <= 2) { 
            dfs(grid, nx, ny, dx, dy, numRedir, path);
            
            // Backtracing the path when backing out of last recursion 
            path.pop();
          }
        }
      }
    }
      
    /** 
        BoardEntityData: 
        {
         "worldX" --- the absolute x coords in the world 
         "worldY" 
         
         "nunTiles"
         "tiles" 
         "grid" --- An array of cells, each element is tile's type ID
        }
     */

    exp.init = function(boardData) { 
      var numTiles = boardData.numTiles * boardData.numTiles;
      this._boardData = boardData;
     
      // Pre-allocate the arrays
      this._boardData.tiles = [];
      this._boardData.tiles.length = numTiles;
    };
    
    exp.grid = function() {
      return this._boardData.grid;
    };
    
    exp.setTile = function(tile, x, y) {   
      this._boardData.tiles[y * this._boardData.numTiles + x] = tile; 
    }; 
   
    exp.numTilesSide = function() {
      return this._boardData.numTiles; 
    };
    
    exp.gapXY = function() {
      return {x: this._boardData.gapX, y: this._boardData.gapY };
    };
    
    exp.worldXY = function() {
      return {x: this._boardData.worldX, y: this._boardData.worldY};
    };
    
    exp.tryConnect = function(ta, tb) {
      var gridXYA = ta.gridXY();
      var gridXYB = tb.gridXY();
      var path = [];
      dfs(this._boardData.grid, gridXYA.x, gridXYA.y, gridXYB.x, gridXYB.y, -1, 0, path);
      return found;
    };

    return exp; 
  }());
  
  /********************************************************
   * The Tile Factory for tiles creation 
   *******************************************************/
  Factory = (function() {
    var exp = {}; 

    exp.createTile = function(boardData, defaultData) { 
      var newTile = Object.create(Tile);
      newTile.init(boardData, defaultData);
      return newTile;
    }
    
    exp.createBoard = function(defaultData) {
      var newBoard = Object.create(Board);
      newBoard.init(defaultData);
      return newBoard;
    }
    
    return exp;
  }());


  
  /********************************************************
   * The Game Module
   *   - Handles the gamestates
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
    var _matchingTiles = [];  // the two tiles that are going to be tested if they can match
    
    /** Module's Private Methods */ 
    function _regState(name, startFunc, procesFunc, exitFunc) { 
      _states[name] = {
        'onStart': startFunc,
        'onProcess': processFunc, 
        'onExit': exitFunc
      }
    }
    
    function genGrid(template) {
      return template; 
    }

    function worldXYToGridXY(worldX, worldY) { 
      var boardWorldPos = _board.worldXY();
      var tilesGapXY = _board.gapXY();
      var x = Math.floor((worldX - boardWorldPos.x) / (32 + tilesGapXY.x));
      var y = Math.floor((worldY - boardWorldPos.y) / (32 + tilesGapXY.y));
      
      return {"x": x, "y": y};
    }
    
    function clickEventHandler(e) {
      // console.log("Mouse Clicked!" + " x: " + e.stageX + " y: " + e.stageY);
     
      var numTiles = _board.numTilesSide();
      var gridXY = worldXYToGridXY(e.stageX, e.stageY);
      console.log("Tile Clicked!" + " x: " + gridXY.x + " y: " + gridXY.y);
      
      _matchingTiles.push(_tiles[gridXY.y*numTiles + gridXY.x]); 
      if (_matchingTiles.length == 2) {
        
        var ta = _matchingTiles[0];
        var tb = _matchingTiles[1]; 
        
        if (ta.typeID() === tb.typeID()) { 
          if (_board.tryConnect(ta, tb)) {
            console.log("FOUND PATH!");
          }
        }
        else { 
            console.log("NOT SAME TYPE!");
        }
        _matchingTiles.length = 0; 
      }
    }

    /** Public Interfaces */ 
    exp.init = function(canvas) {
      _stage = new createjs.Stage(canvas);
      
      // Create the board 
      var boardAssetData = AssetsManager.cacheAsset('board_data');
      var boardData = {
        grid: genGrid(boardAssetData.template),
        tileTypes: boardAssetData.tile_types,
        numTiles: boardAssetData.num_tiles,
        gapX: 4,
        gapY: 4,
        worldX: 0,
        worldY: 0
      };
      _board = Factory.createBoard(boardData);
      
      // Create the tiles
      var grid = _board.grid();
      _.each(grid, function(type, idx, list) {
        var x = idx % boardData.numTiles;
        var y = Math.floor(idx / boardData.numTiles);
        var tileAssetName = boardData.tileTypes[type];
        var tileAssetData = AssetsManager.cacheAsset(tileAssetName);
        var tileData = {
          gridX: x,
          gridY: y,
          typeID: type,
          width: tileAssetData.width,
          height: tileAssetData.height,
          assetName: tileAssetName
        };
        var tile = Factory.createTile(boardData, tileData); 
        tile.gridXY(x, y);
        _tiles.push(tile); 
        _board.setTile(tile, x, y);
      });
    };
    
    exp.start = function() {
      // Add tiles to stage
      _.each(_tiles, function(tile) { 
        tile.addToStage(_stage);
      });
      
      _stage.addEventListener('click', clickEventHandler);

      createjs.Ticker.timingMode = createjs.Ticker.RAF;
      createjs.Ticker.addEventListener("tick", _stage);
    }

    exp.stage = function() {
      return _stage;
    }

    return exp;
  })();

  function initGame() {
    // Init the canvas
    canvasDom = $('#game-canvas')[0];
    Game.init(canvasDom);
  }
  
  function startGame() {
    Game.start(); 
  }
  
  $(function() {
    // DOM is ready! 
    
    // Load assets
    $.when(AssetsManager.downloadManifest('assets/assets.json'))
      .then(function(manifestData) {
        $.when.apply($, AssetsManager.downloadBundles(manifestData))
          .then(function() {
            console.log('All assets downloaded!');
            
            // All assets downloaded, init game
            initGame();
            
            // Start game
            startGame();
          });
      });
  });
  
}(window, window.jQuery, window._, window.createjs));
