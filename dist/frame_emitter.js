"use strict";

var _inherits = function (child, parent) {
  child.prototype = Object.create(parent && parent.prototype, {
    constructor: {
      value: child,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (parent) child.__proto__ = parent;
};

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var logger = require("winston").loggers.get("frame-emitter");

var frame = require("./frame");
var Frame = frame.Frame;
var DataFrame = frame.DataFrame;
var ErrorFrame = frame.ErrorFrame;
var AckFrame = frame.AckFrame;
var NackFrame = frame.NackFrame;

var FrameEmitter = (function () {
  var _EventEmitter = EventEmitter;
  var FrameEmitter = (
    /*
        @constructor
        @param {object} hal - An instance of PN532_UART or PN532_I2C
    */
    function FrameEmitter(hal) {
      var _this = this;
      this.hal = hal;
      this.buffer = new Buffer(0);

      logger.debug("listening to data");

      // console.dir(hal);
      this.hal.on("data", function (data) {
        logger.debug("Data received", util.inspect(data));
        _this.buffer = Buffer.concat([_this.buffer, data]);
        _this._processBuffer();
      });

      this.hal.on("error", function (error) {
        logger.error("Error on HAL", error);
        _this.emit("error", error);
      });
    }
  );

  _inherits(FrameEmitter, _EventEmitter);

  FrameEmitter.prototype._processBuffer = function () {
    // TODO: filter garbage at front of buffer (anything not 0x00, 0x00, 0xFF at start?)

    logger.debug("Processing buffer", util.inspect(this.buffer));

    if (Frame.isFrame(this.buffer)) {
      logger.debug("Frame found in buffer");

      var frame = Frame.fromBuffer(this.buffer);
      // logger.info('Frame', frame.toString());
      logger.info("Frame", util.inspect(frame));
      this.emit("frame", frame);

      if (frame instanceof ErrorFrame) {
        logger.error("ErrorFrame found in buffer");
        this.emit("error", frame);
      } else if (frame instanceof DataFrame) {
        logger.debug("DataFrame found in buffer");
        this.emit("response", frame);
      } else if (frame instanceof AckFrame) {
        logger.debug("AckFrame found in buffer");
      } else if (frame instanceof NackFrame) {
        logger.debug("NackFrame found in buffer");
      }

      this.buffer = this.buffer.slice(frame.getFrameLength()); // strip off frame's data from buffer

      // If more data still on buffer, process buffer again,
      // otherwise next 'data' event on serial will process the buffer after more data is receive
      if (this.buffer.length) {
        this._processBuffer();
      }
    }
  };

  return FrameEmitter;
})();

exports.FrameEmitter = FrameEmitter;