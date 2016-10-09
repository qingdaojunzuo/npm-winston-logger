(function(root) {

  var _ = require('underscore'),
      sourceMap = require('source-map'),
      path = require('path'),
      fs = require('fs'),
      moment = require('moment');

  var __stack = function() {
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
      return stack;
    };
    var ostl = Error.stackTraceLimit;
    var e = new Error;
    Error.stackTraceLimit = 30;
    Error.captureStackTrace(e, arguments.callee);
    var s = e.stack;
    Error.stackTraceLimit = ostl;
    Error.prepareStackTrace = orig;
    return s;
  };

  module.exports = (function(root) {
    var util = function() {},
        cachedMap = {};

    var getStack = function() {
      var count = 0,
          found = '';
      var stack = __stack();
      // iterate all stack
      _.each(stack, function(v, k) {
        var name = v.getFileName() || '';
        var func = (v.getFunctionName() || '').toLowerCase();
        name = name ? name.substring(name.lastIndexOf('/') + 1) : '';

        if (name === 'common.js' && func === 'target.(anonymous function)')
          found = stack[count + 1];
        if (name === 'console.js' && (func === 'console.log'
              || func === 'console.info' || func === 'console.error'
              || func === 'console.debug' || func === 'console.warn'))
          found = stack[count + 1];
        count++;
      });
      return found;
    };

    var getSource = function() {
      var stack = getStack();
      if (!stack) return {};

      try {
        var file = stack.getFileName() + '.map';
        if (fs.existsSync(file)) {
          var s = cachedMap[file];
          if (!s) {
            s = fs.readFileSync(file);
            cachedMap[file] = s;
          }
          var c = new sourceMap.SourceMapConsumer(JSON.parse(s));
          var o = c.originalPositionFor({
            line: stack.getLineNumber() || '', 
            column: 0
          });
          return {
            func: '', // stack.getFunctionName() || '',
            line: o.line || '',
            file: o.source || ''
          };
        }
      } catch(e) {
        // catch all exception here
      }
      return {
        func: '',
        line: stack.getLineNumber() || -1,
        file: stack.getFileName() || ''
      }
    };

    var format = function() {
      var r = '',
          s = getSource();
      if (s.file)
        r += s.file ? s.file.substring(s.file.lastIndexOf('/') + 1) : '';
      if (s.func)
        r += s.func ? (s ? ':' : '') + s.func.substring(s.func.lastIndexOf('.') + 1) : '';
      if (s.line)
        r += s.line ? (s ? ':' : '') + s.line : '';
      return r;
    };

    util.prototype.defFormatter = function(opt) {
      return opt.level.toUpperCase() + ' '
        + '[' + opt.timestamp() + ']' + ' '
        + (opt.message || '')
        + (opt.meta && Object.keys(opt.meta).length ? '\n\t' + JSON.stringify(opt.meta) : '');
    };

    util.prototype.defTimestamp = function() {
      return moment().format('YYYY-MM-DD HH:mm:ss,SSS');
    };

    util.prototype.lineFormatter = function(opt) {
      return this.defFormatter(opt) + ' (' + format() + ')';
    };

    util.prototype.convert = function(a) {
      var args = _.map(a, function(arg) {
        return (_.isObject(arg) || _.isArray(arg))
          ? JSON.stringify(arg)
          : String(arg);
      });
      return args.join(' ') || '';
    };

    util.prototype.stack = __stack;

    return new util();
  }());

}(this));
