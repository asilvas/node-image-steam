import { EventEmitter } from 'node:events';
import sem from 'semaphore';

export default class Throttle extends EventEmitter {
  options: any;
  sem_ccProcessors: any;
  sem_ccPrefetchers: any;
  ccRequests: number;

  constructor(options?: any) {
    super();

    options = options || {};
    options.ccProcessors = options.ccProcessors || 4;
    options.ccPrefetchers = options.ccPrefetchers || 20;
    options.ccRequests = options.ccRequests || 100;
    options.responseTimeoutMs = options.responseTimeoutMs || 120000;
    this.sem_ccProcessors = sem(options.ccProcessors);
    this.sem_ccPrefetchers = sem(options.ccPrefetchers);
    this.ccRequests = 0;
    this.options = options;
  }

  startRequest(req: any, res: any): boolean {
    if (this.ccRequests >= this.options.ccRequests) {
      return false;
    }

    const end = res.end;
    const $this = this;
    this.ccRequests++;
    req.imageSteam = { endCount: 0, prefetchers: 0, processors: 0 };

    const cleanupTimer = setTimeout(() => {
      this.emit('warn', 'res.end NEVER called, cleaning up!');
      try {
        res.writeHead(408);
      } catch (ex) {} // eat it
      res.end();
    }, this.options.responseTimeoutMs);

    res.end = function (this: any, ...args: any[]) {
      if (req.imageSteam.endCount !== 0) {
        $this.emit('warn', 'res.end invoked more than once!');
        // THIS IS ALLOWED AS WE MUST ALWAYS ALLOWING FREEING OF
        // NEWLY ALLOCATED SEATS.
      } else {
        // only perform these tasks once EVER
        clearTimeout(cleanupTimer);
        $this.ccRequests--;
      }
      req.imageSteam.endCount++;
      if (req.imageSteam.prefetchers > 0) {
        req.imageSteam.prefetchers = 0;
        $this.sem_ccPrefetchers.leave(req.imageSteam.prefetchers);
      }
      if (req.imageSteam.processors > 0) {
        req.imageSteam.processors = 0;
        $this.sem_ccProcessors.leave(req.imageSteam.processors);
      }
      end.apply(res, args);
    }.bind(res);

    return true;
  }

  getPrefetcher(req: any, cb: (err?: Error) => void): void {
    if (!req.imageSteam) {
      throw new Error('Cannot getPrefetcher without calling startRequest');
    }
    this.sem_ccPrefetchers.take(() => {
      req.imageSteam.prefetchers++;
      // CRITICAL! If res.end has already been called, we MUST
      //   auto-release the seats. Typically happens due to
      //   timeout before semaphore releasing leases.
      if (req.imageSteam.endCount > 0) {
        // release leases
        this.sem_ccPrefetchers.leave(req.imageSteam.prefetchers);
        req.imageSteam.prefetchers = 0;
        return void cb(
          new Error('Expired request has auto-released prefetch leases')
        );
      }
      cb();
    });
  }

  getProcessor(req: any, cb: (err?: Error) => void): void {
    if (!req.imageSteam) {
      throw new Error('Cannot getProcessor without calling startRequest');
    }
    this.sem_ccProcessors.take(() => {
      req.imageSteam.processors++;
      // CRITICAL! If res.end has already been called, we MUST
      //   auto-release the seats. Typically happens due to
      //   timeout before semaphore releasing leases.
      if (req.imageSteam.endCount > 0) {
        // release leases
        this.sem_ccProcessors.leave(req.imageSteam.processors);
        req.imageSteam.processors = 0;
        return void cb(
          new Error('Expired request has auto-released processor leases')
        );
      }
      cb();
    });
  }
}
