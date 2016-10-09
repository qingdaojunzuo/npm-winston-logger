module.exports = (function(root) {

  var winston = require('winston');
  var common = require('winston/lib/winston/common');
  var util = require('./log-util.js');
  require('winston-logstash');

  var logstash = winston.transports.Logstash;

  logstash.prototype.setFormatter = function(f) {
    this.formatter = f || '';
  };

  logstash.prototype.log = function(level, msg, meta, callback) {
    var self = this,
        meta = winston.clone(meta || {}),
        log_entry;
    for (var property in this.meta_defaults)
      meta[property] = this.meta_defaults[property];
    if (self.silent)
      return callback(null, true);
    if (self.strip_colors) {
      msg = msg.stripColors;
      // Let's get rid of colors on our meta properties too.
      if (typeof meta === 'object')
         for (var property in meta)
           meta[property] = meta[property].stripColors;
    }
    log_entry = common.log({
      level: level,
      message: msg,
      node_name: this.node_name,
      meta: meta,
      timestamp: util.defTimestamp,
      json: false,
      label: this.label,
      formatter: self.formatter || ''
    });
    if (!self.connected) {
      self.log_queue.push({
        message: log_entry,
        callback: function () {
          self.emit('logged');
          callback(null, true);
        }
      });
    } else {
      self.sendLog(log_entry, function () {
        self.emit('logged');
        callback(null, true);
      });
    }
  };

}(this));
