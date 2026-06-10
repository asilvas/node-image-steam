import http from './http/index.ts';
import Router from './router/index.ts';
import Image from './image.ts';
import Storage from './storage/index.ts';
import Processor from './processor/index.ts';
import Security from './security/index.ts';
import Throttle from './http/throttle.ts';

export {
  http,
  Router as router,
  Image,
  Storage as storage,
  Processor as processor,
  Security as security,
  Throttle as throttle,
};

export default {
  http,
  router: Router,
  Image,
  storage: Storage,
  processor: Processor,
  security: Security,
  throttle: Throttle,
};
