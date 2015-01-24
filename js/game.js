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
  p._highlight = false;
  p._selected = false;

  p.initialize = function(tile) {
    this._tile= tile;
  };
  
  p.destroy = function() {
    this._tile = null;
  };
  
  p.setHighlight = function(hl) { 
    this._highlight = hl;
  };
  
  p.setSelected = function(sel) {
    this._selected = sel;
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
    
    if (this._selected) {
      this.drawSelected(ctx,destXY.x, destXY.y, tilesAssetData.width, tilesAssetData.height);
    }
    else if (this._highlight) {
      this.drawHighlight(ctx,destXY.x, destXY.y, tilesAssetData.width, tilesAssetData.height);
    }

    ctx.restore();
  };
  
  p.drawTile = function(ctx, img, x, y, w, h, dx, dy) {
    ctx.drawImage(img, x, y, w, h, dx, dy, w, h); 
  };
  
  p.drawHighlight = function(ctx, x, y, w, h) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(50, 50, 50, 0.8)";
    ctx.translate(x-1, y-1);
    ctx.strokeRect(0, 0, w+2, h+2);
    ctx.restore();
  };
  
  p.drawSelected = function(ctx, x, y, w, h) { 
    ctx.save();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(200, 200, 200, 0.7)";
    ctx.translate(x-1, y-1);
    ctx.strokeRect(0, 0, w+2, h+2);
    ctx.restore();
  };
  
  p.tile = function() { 
    return this._tile;
  };
  
  /********************************************************
   * The Path DisplayObject extending from createjs
   *******************************************************/
  var PathDisplayObject = function() {
    this.initialize();
  }
  
  var super_p = createjs.DisplayObject.prototype;
  var p = PathDisplayObject.prototype = new createjs.DisplayObject();
  p.constructor = PathDisplayObject;
 
  p._path = []; 
  
  p.initialize = function() {
  };
  
  p.updatePath = function(path) { 
    this._path = path; 
  };
  
  p.draw = function(ctx, ignoreCache) {
    ctx.save(); 
    
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this._path[0].x, this._path[0].y);
    for (var i = 1; i < this._path.length; i++) { 
      ctx.lineTo(this._path[i].x, this._path[i].y);
    }
    ctx.stroke();
    ctx.closePath();

    ctx.restore();
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
      if (!this.isDummyTile()) {
        this._displayObject = new TileDisplayObject(this);
      }
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
   
    exp.worldXYCenter = function() { 
      var tileSize = this.tileSize();
      return {x: this._worldX + tileSize.w/2, y: this._worldY + tileSize.h/2};
    };
    
    exp.addToStage = function(stage) {
      stage.addChild(this._displayObject);
    }; 
    
    exp.removeFromStage = function(stage) {
      if (this._displayObject) {
        this._displayObject.destroy();
        stage.removeChild(this._displayObject);
        stage.update();
      }
    };
    
    exp.updateWorldPos = function() {
      this._worldX = this._boardData.worldX + this._tileData.gridX * (this._tileData.width + this._boardData.gapX); 
      this._worldY = this._boardData.worldY + this._tileData.gridY * (this._tileData.height + this._boardData.gapY); 
    };
   
    exp.assetName = function() {
      return this._tileData.assetName;
    };
    
    exp.tileSize = function() {
      var tileAssetData = AssetsManager.cacheAsset(this.assetName());
      return {w: tileAssetData.width, h: tileAssetData.height};
    };
    
    exp.typeID = function(typeID) {
      if (typeID === undefined)
        return this._tileData.typeID;
      this._tileData.typeID = typeID;
    };
    
    exp.isDummyTile = function() {
      return this.typeID() === 0;
    };
    
    exp.onConnected = function() {
      this.typeID(0);
      if (this._displayObject) {
        this._displayObject.visible = false;
      }
    };
    
    exp.highlight = function(hl) {
      if (hl === undefined) {
        hl = true;
      }
      if (this._displayObject) {
        this._displayObject.setHighlight(hl);
      }
    };
    
    exp.select = function(sel) {
      if (sel === undefined) {
        sel = true;
      }
      if (this._displayObject) {
        this._displayObject.setSelected(sel);
      }
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
    var foundPath = [];
    var isVisited = [];
    
    exp.tileType = function(x, y, typeID) { 
      if (typeID === undefined)
        return this._boardData.grid[y * this._boardData.numTiles + x];
      this._boardData.grid[y * this._boardData.numTiles + x] = typeID;
    };

    exp.isTileWalkable = function(x, y) { 
      return this.tileType(x, y) == 0; 
    };
    
    exp.markTileVisited = function(x, y) { 
      isVisited[y * this._boardData.numTiles + x] = 1;
    }; 
    
    exp.clearVisited = function(x, y) { 
      isVisited[y * this._boardData.numTiles + x] = 0;
    }; 

    exp.isTileVisited = function(x, y) {
      return isVisited[y * this._boardData.numTiles + x] === 1;
    };
    
    
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
    exp.dfs = function(x, y, dx, dy, dir, numRedir, path) {
      if (found || numRedir > 2) { return; }
      if (x === dx && y === dy) { 
        found = true; 
        foundPath.push(path.slice(0));
        return; 
      }
      
      // Try all 4 directions from current cell
      for (var i = 0; i < 4; ++i) {
        // Get next cell coords nx, ny based on direction
        var nx = x + dirs[i][0];
        var ny = y + dirs[i][1];
        
        // Direction of next step
        var nd = i; 
        
        if (nx >= 0 && nx <= this._boardData.numTiles - 1 && 
            ny >= 0 && ny <= this._boardData.numTiles - 1 && 
            (this.isTileWalkable(nx, ny) || (nx === dx && ny === dy)) && 
            !this.isTileVisited(nx, ny)) {
         
          if (numRedir <= 2) {
            if (dir === -1 && numRedir <= 2) { 
              this.markTileVisited(nx, ny);
              path.push({x: nx, y: ny});
              this.dfs(nx, ny, dx, dy, i, numRedir, path);
              path.pop(); // back-tracing
              this.clearVisited(nx, ny);
            } 
            if (dir === i && numRedir <= 2) {
              this.markTileVisited(nx, ny);
              path.push({x: nx, y: ny});
              this.dfs(nx, ny, dx, dy, dir, numRedir, path);
              path.pop(); // back-tracing
              this.clearVisited(nx, ny);
            }
            if ((nd !== dir && dir !== -1) && numRedir <= 2) { 
              this.markTileVisited(nx, ny);
              path.push({x: nx, y: ny});
              this.dfs(nx, ny, dx, dy, i, numRedir+1, path);
              path.pop(); // back-tracing
              this.clearVisited(nx, ny);
            }  
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
      var res; 
      
      foundPath = [];
      isVisited = _.range(this._boardData.numTiles * this._boardData.numTiles).map(function() { return 0; });
      path.push({x: gridXYA.x, y: gridXYA.y});
      this.dfs(gridXYA.x, gridXYA.y, gridXYB.x, gridXYB.y, -1, 0, path);
      res = found;
      found = false;
      return res;
    };
    
    exp.onConnected = function(ta, tb) {
      ta.onConnected(); 
      tb.onConnected();
      var gridXYA = ta.gridXY();
      var gridXYB = tb.gridXY();
      this.tileType(gridXYA.x, gridXYA.y, 0);
      this.tileType(gridXYB.x, gridXYB.y, 0);
    }; 
    
    exp.foundPath = function() {
      return foundPath;
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
   * The Board Generator Module
   *******************************************************/
  BoardGenerator = (function() {
    var exp = {}; 

    function swap(grid, sx, sy, dx, dy, cols) {
      if (sx === dx || sy === dy) {
        while (sx === dx || sy === dy) {
          sx = rand(1, cols - 1); 
          sy = rand(1, cols - 1);
          dx = rand(1, cols - 1); 
          dy = rand(1, cols - 1);
        }
      }
      grid[sy * cols + sx] = grid[sy * cols + sx] ^ grid[dy * cols + dx];
      grid[dy * cols + dx] = grid[sy * cols + sx] ^ grid[dy * cols + dx];
      grid[sy * cols + sx] = grid[sy * cols + sx] ^ grid[dy * cols + dx];
    }
   
    function rand(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    function randXY(min, max) {
      if (max < min) {
        min = min ^ max; 
        max = min ^ max; 
        min = min ^ max;
      }
      
      var dx = rand(min, max); 
      var dy = rand(min, max);
      return {x: dx, y: dy};
    }

    exp.genBoard = function(template, rows, cols) {
    };
    
    exp.shuffle = function(template, rows, cols) {
      var dxy;
      var grid = template.slice(0);
      for (var i = 1; i < rows - 1; i++) { 
        for (var j = 1; j < cols - 1; j++) {
          dxy = {x: rand(1, rows-1), y: rand(1, cols-1)};
          swap(grid, j, i, dxy.x, dxy.y, cols);
        }
      }
      
      return grid;
    };

    return exp;
  })();
  
  /********************************************************
   * The Game Module
   *   - Handles the gamestates
   *   - Using some app-level modules such as assets manager
   *******************************************************/
  Game = (function() {
    var exp = {};
    
    /** Module's Private Variables */
    var _stage;
    var _bgBitmap; 
    var _frameBitmp;
    
    
    var _curStat;
    var _states = {};
    var _assetManifest = 'assets/assets.json';
    
    var _board;
    var _tiles = [];
    var _matchingTiles = [];  // the two tiles that are going to be tested if they can match
    var _highlightTile = null;
    
    var _pathDispalyObject = null;
    
    /** Module's Private Methods */ 
    function _regState(name, startFunc, procesFunc, exitFunc) { 
      _states[name] = {
        'onStart': startFunc,
        'onProcess': processFunc, 
        'onExit': exitFunc
      }
    }
    
    function genGrid(template) {
      return template.slice(0); 
    }

    function worldXYToGridXY(worldX, worldY) { 
      var boardWorldPos = _board.worldXY();
      var tilesGapXY = _board.gapXY();
      var x = Math.floor((worldX - boardWorldPos.x) / (32 + tilesGapXY.x));
      var y = Math.floor((worldY - boardWorldPos.y) / (32 + tilesGapXY.y));
      
      return {"x": x, "y": y};
    }
    
    function showPath() {
      _pathDisplayObject.visible = true;
    }

    function hidePath() {
      _pathDisplayObject.visible = false;
    }
    
    function clickEventHandler(e) {
      // console.log("Mouse Clicked!" + " x: " + e.stageX + " y: " + e.stageY);
      var numTiles = _board.numTilesSide();
      var gridXY = worldXYToGridXY(e.stageX, e.stageY);
      console.log("Tile Clicked!" + " x: " + gridXY.x + " y: " + gridXY.y);
      var selectedTile = _tiles[gridXY.y*numTiles + gridXY.x];
      selectedTile.select();
      _matchingTiles.push(selectedTile); 
      if (_matchingTiles.length == 2) {
        
        var ta = _matchingTiles[0];
        var tb = _matchingTiles[1]; 
        
        if (ta.typeID() === tb.typeID() && ta !== tb) { 
          if (_board.tryConnect(ta, tb)) {
            _board.onConnected(ta, tb);
           
            var pathGridXY = _board.foundPath();
            var pathWorldXY = []; 
            _.each(pathGridXY[0], function(node) { 
              var tile = _tiles[node.y*numTiles + node.x]; 
              var centerXY = tile.worldXYCenter();
              pathWorldXY.push({x: centerXY.x, y: centerXY.y});
            });
           
            _pathDisplayObject.updatePath(pathWorldXY);
            showPath();
            window.setTimeout(hidePath, 600);
            
            console.log("FOUND PATH!");
          }
        }
        _matchingTiles[0].select(false);
        _matchingTiles[1].select(false);
        _matchingTiles.length = 0; 
      }
    }
    
    function mouseMoveHandler(e) {
      var gridXY = worldXYToGridXY(e.stageX, e.stageY);
      var numTiles = _board.numTilesSide();
      if (gridXY.x > numTiles - 1 || gridXY.y > numTiles - 1) return; 
      
      if (gridXY.x >= 0 && gridXY.y < numTiles) {
        tile = _tiles[gridXY.y*numTiles + gridXY.x]; 
        if (_highlightTile !== tile) {
          if (_highlightTile) {
            _highlightTile.highlight(false);
          }
          _highlightTile = tile;
          if (_highlightTile) {
            _highlightTile.highlight();
          }
        }
      }
    }
    
    function tickHandler(e) {
      if (_stage && _frameStage) { 
        _stage.update(e);
        _frameStage.update(e);
      }
    }

    /** Public Interfaces */ 
    exp.init = function(gameCanvas, frameCanvas) {
      var bgImg = AssetsManager.cacheAsset('background');
      var frameImg = AssetsManager.cacheAsset('frame');
      
      _stage = new createjs.Stage(gameCanvas);
      _frameStage = new createjs.Stage(frameCanvas);
      _bgBitmap = new createjs.Bitmap(bgImg);
      _frameBitmap = new createjs.Bitmap(frameImg);
      
      _stage.addChild(_bgBitmap);
      _frameStage.addChild(_frameBitmap);
      
      // Create the path display object
      _pathDisplayObject = new PathDisplayObject();
      _stage.addChild(_pathDisplayObject);
      hidePath();
      
      this.newGame();
    };
    
    exp.start = function() {
      _stage.addEventListener('click', clickEventHandler);
      _stage.addEventListener('stagemousemove', mouseMoveHandler); 

      createjs.Ticker.timingMode = createjs.Ticker.RAF;
      createjs.Ticker.addEventListener("tick", tickHandler);
    };
    
    exp.newGame = function() {
      
      var bgImg = AssetsManager.cacheAsset('background');
      var boardAssetData = AssetsManager.cacheAsset('board_data');
      var numTiles = boardAssetData.num_tiles;
      
      // Center the board relative to the background
      var bgWorldX = bgImg.width/2 - numTiles * 16;
      var bgWorldY = 180;
      
      var boardAssetData = AssetsManager.cacheAsset('board_data');
      
      // Create the board 
      var boardData = {
        grid: BoardGenerator.shuffle(boardAssetData.template, numTiles, numTiles),
        tileTypes: boardAssetData.tile_types,
        numTiles: numTiles,
        gapX: 4,
        gapY: 4,
        worldX: bgWorldX,
        worldY: bgWorldY
      };
      _board = Factory.createBoard(boardData);
      
      // Remove tiles from stage
      _.each(_tiles, function(t) { 
        t.removeFromStage(_stage);
      });
      
      // Clear the board
      //_tiles.length = 0;
      _tiles = [];
      
      // Create the tiles
      var grid = _board.grid();
      var tile;

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
        tile = Factory.createTile(boardData, tileData); 
        tile.gridXY(x, y);
        _tiles.push(tile); 
        _board.setTile(tile, x, y);
      });
      
      // Add tiles to stage
      _.each(_tiles, function(t) { 
        t.addToStage(_stage);
      });
    };

    exp.stage = function() {
      return _stage;
    };

    return exp;
  })();
  
  function setupUI() {
    $('#new-game-btn').on('click', function(evt) {
      evt.preventDefault();
      Game.newGame();
    });
  }

  function initGame() {
    // Init the canvas
    var canvasDom = $('#game-canvas')[0];
    var frameCanvasDom = $('#frame-canvas')[0]; 
    
    Game.init(canvasDom, frameCanvasDom);
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
            
            // Setup UI event
            setupUI();
            
            // All assets downloaded, init game
            initGame();
            
            // Start game
            startGame();
          });
      });
  });
  
}(window, window.jQuery, window._, window.createjs));
