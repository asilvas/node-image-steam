import { EventEmitter } from 'node:events';
import async from 'async';
import sharp from 'sharp';
import _ from 'lodash';
import helpers from '../helpers/index.ts';
import Image from '../image.ts';
import stepProcessors from './steps/index.ts';
import defaults from './processor-defaults.ts';

export default class Processor extends EventEmitter {
  options: any;
  defaults: any;

  constructor(options?: any) {
    super();

    this.options = _.merge({}, defaults, options || {});

    if (this.options.sharp) {
      if ('cache' in this.options.sharp) {
        sharp.cache(this.options.sharp.cache);
      }
      if ('concurrency' in this.options.sharp) {
        sharp.concurrency(this.options.sharp.concurrency);
      }
      // note: sharp >=0.29 always uses SIMD; the legacy `simd` option is
      // accepted but ignored (previously it incorrectly called concurrency())
      if ('defaults' in this.options.sharp) {
        this.defaults = this.options.sharp.defaults;
      }
    }
  }

  process(
    originalImage: any,
    imageSteps: any[],
    options: any,
    storageOptions?: any,
    cb?: any
  ): void {
    if (typeof options === 'function') {
      cb = options;
      options = {};
    }
    options = options || {};
    let sharpI;
    try {
      sharpI = sharp(originalImage.buffer, this.defaults);
    } catch (err) {
      return cb(err);
    }
    const context = {
      options: _.merge({}, this.options, storageOptions),
      originalImage: originalImage,
      formatOptions: {},
      imageSteps: imageSteps,
      hqOriginalSteps: options.hqOriginalSteps,
      hqOriginalMaxPixels: options.hqOriginalMaxPixels,
      processedImage: new Image(originalImage.info),
      sharp: sharpI,
    };

    const tasks = [
      getMetaDataTask(context, context.originalImage),
      getProcessorTask(context, imageSteps),
    ];

    async.series(tasks, function (err) {
      if (err) {
        return void cb(err);
      }

      cb(null, context.processedImage);
    });
  }
}

function getMetaDataTask(context: any, image: any) {
  return function (cb: any) {
    context.sharp.metadata(function (err: any, metadata: any) {
      if (err) {
        return void cb(err);
      }

      delete metadata.exif;
      delete metadata.icc;
      delete metadata.iptc;
      delete metadata.xmp;
      image.info = _.merge(image.info, metadata);
      if (image.info.pages && image.info.pageHeight) {
        // backward compatibility to support animated images
        image.info.height = image.info.pageHeight;
      }
      cb(null, metadata);
    });
  };
}

function getProcessorTask(context: any, imageSteps: any[]) {
  return function (cb: any) {
    if (!imageSteps || !imageSteps.length) {
      return void cb(null, context.originalImage);
    }

    if (
      context.hqOriginalSteps &&
      context.originalImage.info.width * context.originalImage.info.height <=
        context.hqOriginalMaxPixels
    ) {
      // if hq steps are provided, use them only if the size of the original is <= that of allowed high-quality settings
      imageSteps = context.hqOriginalSteps;
    }

    if (context.originalImage.info.hasAlpha) {
      imageSteps.forEach(function (step) {
        if (step.name === 'format' && step.format === 'jpeg') {
          step.format = 'png'; // retain alpha
        }
      });
    }

    try {
      imageSteps.forEach(function (step) {
        const stepProcessor = (stepProcessors as any)[step.name];
        if (!stepProcessor) return; // do not process
        stepProcessor(context, step, imageSteps);
      });
    } catch (ex) {
      return void cb(ex);
    }

    context.sharp.toBuffer(function (err: any, outputBuffer: Buffer) {
      if (err) {
        return void cb(err);
      }

      context.processedImage.buffer = outputBuffer;
      context.processedImage.info.hash = helpers.getHashFromImage(
        context.processedImage
      );
      context.processedImage.info.byteSize = outputBuffer.length;
      cb(null, context.processedImage);
    });
  };
}
