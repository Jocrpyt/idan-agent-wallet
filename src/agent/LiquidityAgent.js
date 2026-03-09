const BaseAgent = require("./BaseAgent");

class LiquidityAgent extends BaseAgent {
  constructor(opts = {}) {
    super({ ...opts, tickMs: opts.tickMs || 10000 });
    this.poolAddress = opts.poolAddress || null;
    this.targetRatio = opts.targetRatio || 1.0;
    this.rebalanceThreshold = opts.rebalanceThreshold || 0.05;
    this.rebalanceAmount = opts.rebalanceAmount || 0.005;
    this.pool = {
      solReserve: 10.0,
      tokenReserve: 1000.0,
    };
    this.state = {
      rebalances: 0,
      totalSOLProvided: 0,
      feesEarned: 0,
      events: [],
    };
  }

  _simulatePoolActivity() {
    const tradeSize = (Math.random() - 0.5) * 0.2;
    this.pool.solReserve = Math.max(0.1, this.pool.solReserve + tradeSize);
    const k = this.pool.solReserve * this.pool.tokenReserve;
    this.pool.tokenReserve = k / this.pool.solReserve;
    this.state.feesEarned += Math.abs(tradeSize) * 0.003;
  }

  async perceive() {
    this._simulatePoolActivity();
    const balance = await this.wallet.getSOLBalance();
    const currentRatio = this.pool.solReserve / (this.pool.tokenReserve / 100);
    return { balance, currentRatio, pool: { ...this.pool } };
  }

  async decide({ balance, currentRatio }) {
    const drift = Math.abs(currentRatio - this.targetRatio) / this.targetRatio;
    if (drift > this.rebalanceThreshold) {
      const direction = currentRatio > this.targetRatio ? "withdraw" : "add";
      if (direction === "add" && balance < this.rebalanceAmount + 0.05) {
        return { type: "noop", reason: "insufficient balance" };
      }
      return { type: "rebalance", direction, drift, currentRatio };
    }
    return { type: "noop", currentRatio, drift };
  }

  async act(action) {
    if (action.type !== "rebalance") return {};
    return this._rebalance(action);
  }

  async _rebalance({ direction, drift }) {
    let sig = null;
    if (direction === "add") {
      this.pool.solReserve += this.rebalanceAmount;
      this.state.totalSOLProvided += this.rebalanceAmount;
      if (this.poolAddress) {
        try { sig = await this.wallet.transferSOL(this.poolAddress, this.rebalanceAmount); } catch {}
      }
    } else {
      this.pool.solReserve -= this.rebalanceAmount;
      this.state.totalSOLProvided -= this.rebalanceAmount;
    }
    this.state.rebalances++;
    const event = {
      type: "rebalance",
      direction,
      drift: drift.toFixed(4),
      amount: this.rebalanceAmount,
      timestamp: new Date().toISOString(),
      signature: sig,
    };
    this.state.events.push(event);
    return event;
  }
}

module.exports = LiquidityAgent;