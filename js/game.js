(function(window, $, _, createjs) {
  /** TileDisplayObject, inheriting easel.js DisplayObject for tiled sheet rendering */ 
 
  /*
  TileDisplayObject = (function () { 
    var super_p = createjs.Bitmap.prototype;
    var exp = Object.create(super_p);
    
    exp.init = function(tileData) { 
      super_p.initialize.call(this);
      this.tileData = tileData;
    }; 

    exp.draw = function(ctx, ignoreCache) {
      super_p.draw.apply(this, arguments); 
    };
    
    return exp; 
  })();
  */

  var TileDisplayObject = function(tileData) {
    this.initialize(tileData);
  };

  var super_p = createjs.Bitmap.prototype;
  var p = TileDisplayObject.prototype = Object.create(super_p);
  p.constructor = TileDisplayObject;

  p.initialize = function(tileData) {
    super_p.initialize.apply(this, arguments);
  };

  /**
   * Overriden map drawing method
   * @param ctx
   * @param ignoreCache
   */
  p.draw = function(ctx, ignoreCache) {
    super_p.draw.apply(this, arguments);
  };

  
  /**
   * The Game Module
   */
  Game = (function() {
    var exp = {};
    
    /** Private Variables */
    var _staage;
    var _curStat;
    var _states = {}
    
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
    canvasDom = $('#game-canvas')[0];
    Game.init(canvasDom);
  }
  
  $(function() {
    // DOM is ready! 
    
    // Init the Game
    initGame();
    
    var stage = Game.getStage(); 
    
    var testObj = new TileDisplayObject('assets/tiles.png'); 
    testObj.x = 100;
    testObj.y = 100;
    
    stage.addChild(testObj); 

    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", stage);
    
  });
}(window, window.jQuery, window._, window.createjs));

