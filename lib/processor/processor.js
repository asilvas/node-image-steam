var EventEmitter = require('events').EventEmitter;
var async = require('async');
var sharp = require('sharp');
var _ = require('lodash');
var helpers = require('../helpers');
var Image = require('../image');
var stepProcessors = require('./steps');
var defaults = require('./processor-defaults');

module.exports = Processor;

function Processor(options) {
  if (!(this instanceof Processor)) {
    return new Processor(options);
  }

  EventEmitter.call(this);

  this.options = _.merge({}, defaults, options || {});

  // todo: init sharp globals
}

var p = Processor.prototype = new EventEmitter();

p.process = function(originalImage, imageSteps, cb) {
  var context = {
    options: this.options,
    originalImage: originalImage,
    processedImage: new Image(originalImage.info),
    sharp: sharp(originalImage.buffer)
  };

  var tasks = [
    getMetaDataTask(context, context.originalImage),
    getProcessorTask(context, imageSteps)
  ];

  async.series(tasks, function(err, results) {
    if (err) {
      return void cb(err);
    }

    cb(null, context.processedImage);
  });
};

function getMetaDataTask(context, image) {
  return function(cb) {
    context.sharp
      .metadata(function(err, metadata) {
        if (err) {
          return void cb(err);
        }

        delete metadata.exif;
        delete metadata.icc;
        image.info = _.merge(image.info, metadata);
        cb(null, metadata);
      })
    ;
  };
}

function getProcessorTask(context, imageSteps) {
  return function(cb) {
    if (!imageSteps || !imageSteps.length) {
      return void cb(null, context.originalImage);
    }

    if (context.originalImage.info.hasAlpha) {
      imageSteps.forEach(function(step) {
        if (step.name === 'format' && step.format === 'jpeg') {
          step.format = 'png'; // retain alpha
        }
      });
    }

    try {
      imageSteps.forEach(function(step) {
        var stepProcessor = stepProcessors[step.name];
        if (!stepProcessor) {
          throw new Error('Requested step not found');
        }
        stepProcessor(context, step);
      });
    } catch(ex) {
      return void cb(ex);
    }

    context.sharp.toBuffer(function(err, outputBuffer, info) {
      if (err) {
        return void cb(err);
      }

      context.processedImage.buffer = outputBuffer;
      context.processedImage.info.hash = helpers.getHashFromImage(context.processedImage);
      context.processedImage.info.byteSize = outputBuffer.length;
      cb(null, context.processedImage);
    });
  };
}

/* potential future stuff to support batches (multiple processors and step chaining)
function getTask(context, imageStep) {
  var newBatchRequired = !context.batch // no batch
    || imageStep.preserveOrder // if order must be preserved, always use fresh batch
    || (context.batch && context.batch.processor !== imageStep.processor) // if processor differs from current batch
    || imageStep.name in context.batch.operations // if operation has already been issued to processor
  ;
  var batch = newBatchRequired ? batchBegin(context.bufferSrc, imageStep.processor) : context.batch;
  if (newBatchRequired && !context.batch) {
    // end prior batch
  }

  var task = null;

  if (newBatchRequired) {
    // only create new task if new batch is required
    task = (function(batch) {
      var cb = function() {
        // TODO
      };
      return function(asyncCb) {
        // TODO
      };
    })(batch);
  }

  if (imageStep.preserveOrder === true) {
    context.batch = null;

    // end new batch
    batchEnd(batch);
  } else {
    context.batch =
  }

  return task;
}

function batchBegin(buffer, processorName) {
  var batch = {
    processorName: processorName,
    cb: null, // TODO
    operations: {}
  };

  switch (processorName) {
    case 'sharp':
      batch.processor = sharp(buffer);
      break;
    default:
      throw new Error('Unrecognized processor ' + processorName);
  }

  return batch;
}

function batchEnd(batch) {
  if (!batch) {
    throw new Error('Cannot end a non-batch');
  }

  var bufferDst = new Buffer(); // todo
  switch (batch.processorName) {
    case 'sharp':
      batch.processor.toBuffer(bufferDst, batch.cb);
      break;
  }
}
*/
