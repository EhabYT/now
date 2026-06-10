const logger = require('../utils/logger');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.lastRun = new Map();
    this.errorCounts = new Map();
    this.maxErrors = 5;
    this._timers = new Map();
  }

  addJob(name, intervalMs, callback) {
    if (this.jobs.has(name)) {
      this.removeJob(name);
    }

    this.errorCounts.set(name, 0);
    this.jobs.set(name, true);

    const run = async () => {
      if (!this.jobs.get(name)) return;

      try {
        this.lastRun.set(name, Date.now());
        await callback();
        this.errorCounts.set(name, 0);
      } catch (err) {
        const count = (this.errorCounts.get(name) || 0) + 1;
        this.errorCounts.set(name, count);
        logger.error(`Scheduler job "${name}" error (${count}/${this.maxErrors})`, {
          error: err.message,
          stack: err.stack
        });

        if (count >= this.maxErrors) {
          logger.error(`Scheduler job "${name}" stopped after ${this.maxErrors} consecutive errors`);
          this.removeJob(name);
          return;
        }
      }

      if (this.jobs.get(name)) {
        const timer = setTimeout(run, intervalMs);
        this._timers.set(name, timer);
      }
    };

    const timer = setTimeout(run, intervalMs);
    this._timers.set(name, timer);
    logger.debug(`Scheduler job "${name}" started (interval: ${intervalMs}ms)`);
  }

  removeJob(name) {
    this.jobs.delete(name);
    this.errorCounts.delete(name);
    const timer = this._timers.get(name);
    if (timer) {
      clearTimeout(timer);
      this._timers.delete(name);
      logger.info(`Scheduler job "${name}" stopped`);
    }
  }

  removeAll() {
    for (const name of this._timers.keys()) {
      this.removeJob(name);
    }
  }

  getJobNames() {
    return Array.from(this.jobs.keys());
  }
}

module.exports = new Scheduler();
