(function(root) {

  /*
   * Entry point for commonJS style loading
   *
   * This file coordinates the loading of modules in a consistent order
   * in a common JS enviroment
   */

  var commonJS = (typeof exports !== 'undefined');

  if (!commonJS) {
    console.error('exports is undefined, no variable will be exported');
    return;
  }

  module.exports = (function() {
    return require('./js/winston-log.js')();
  }());

}(this));
