
/**
 * The Game Module
 */

Game = (function() {
  
  var _curStat;
  var _states = {}
  
  function _regState(name, startFunc, procesFunc, exitFunc) { 
    this._states[name] = {
      'onStart': startFunc,
      'onProcess': processFunc, 
      'onExit': exitFunc
    }
  }
  
  var exp = {};
  exp.init = function() {
    
  };
  
  return exp;
})();



(function($, window, document) {
  
  function initGame() {
    Game.init();
  }
  
  
  $(function() {
    // DOM is ready! 
    
    // Init the Game
    initGame();
      
    
  });
}(window.jQuery, window, document));

