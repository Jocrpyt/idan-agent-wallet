const { EventEmitter } = require("events");

class BaseAgent extends EventEmitter {
  constructor(opts = {}) {
    super();
    if (!opts.wallet) throw new Error("BaseAgent requires a wallet");
    this.wallet = opts.wallet;
    this.agentId = opts.agentId || this.wallet.agentId;
    this.tickMs = opts.tickMs || 5000;
    this.maxTicks = opts.maxTicks || Infinity;
    this.state = {};
    this.tickCount = 0;
    this.running = false;
    this._timer = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.emit("started", { agentId: this.agentId, timestamp: new Date().toISOString() });
    this._schedule();
  }

  stop() {
    this.running = false;
    if (this._timer) clearTimeout(this._timer);
    this.emit("stopped", { agentId: this.agentId, ticks: this.tickCount });
  }

  _schedule() {
    if (!this.running) return;
    this._timer = setTimeout(async () => {
      await this._tick();
      if (this.running && this.tickCount < this.maxTicks) {
        this._schedule();
      } else {
        this.stop();
      }
    }, this.tickMs);
  }

  async _tick() {
    this.tickCount++;
    try {
      const observations = await this.perceive();
      this.emit("perceived", { agentId: this.agentId, tick: this.tickCount, observations });
      const action = await this.decide(observations);
      this.emit("decided", { agentId: this.agentId, tick: this.tickCount, action });
      if (action && action.type !== "noop") {
        const result = await this.act(action);
        this.emit("acted", { agentId: this.agentId, tick: this.tickCount, action, result });
      }
    } catch (err) {
      this.emit("error", { agentId: this.agentId, tick: this.tickCount, error: err.message });
    }
  }

  async perceive() { return {}; }
  async decide(observations) { return { type: "noop" }; }
  async act(action) { return {}; }

  status() {
    return {
      agentId: this.agentId,
      running: this.running,
      ticks: this.tickCount,
      wallet: this.wallet.summary(),
      state: this.state,
    };
  }
}

module.exports = BaseAgent;