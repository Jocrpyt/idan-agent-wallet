const BaseAgent = require("./BaseAgent");

class SimulatedOracle {
  constructor(basePrice = 100, volatility = 0.02) {
    this.price = basePrice;
    this.volatility = volatility;
    this.history = [basePrice];
  }
  tick() {
    const change = this.price * this.volatility * (Math.random() - 0.5) * 2;
    this.price = Math.max(1, this.price + change);
    this.history.push(this.price);
    if (this.history.length > 20) this.history.shift();
    return this.price;
  }
  sma(n = 10) {
    const window = this.history.slice(-n);
    return window.reduce((a, b) => a + b, 0) / window.length;
  }
}

class TradingAgent extends BaseAgent {
  constructor(opts = {}) {
    super({ ...opts, tickMs: opts.tickMs || 8000 });
    this.poolAddress = opts.poolAddress || null;
    this.tradeAmountSOL = opts.tradeAmountSOL || 0.001;
    this.minSOLReserve = opts.minSOLReserve || 0.1;
    this.oracle = new SimulatedOracle(100, 0.03);
    this.state = {
      position: 0,
      trades: [],
      pnl: 0,
      lastPrice: null,
    };
  }

  async perceive() {
    const [balance, price] = await Promise.all([
      this.wallet.getSOLBalance(),
      Promise.resolve(this.oracle.tick()),
    ]);
    const sma = this.oracle.sma(5);
    return { balance, price, sma };
  }

  async decide({ balance, price, sma }) {
    this.state.lastPrice = price;
    const deviation = (price - sma) / sma;
    const hasFunds = balance > this.minSOLReserve + this.tradeAmountSOL;
    const hasPosition = this.state.position > 0;
    if (deviation < -0.015 && hasFunds) {
      return { type: "buy", price, amount: this.tradeAmountSOL, deviation };
    } else if (deviation > 0.015 && hasPosition) {
      return { type: "sell", price, amount: this.tradeAmountSOL, deviation };
    }
    return { type: "noop", price, deviation };
  }

  async act(action) {
    if (action.type === "buy") return await this._executeBuy(action);
    if (action.type === "sell") return await this._executeSell(action);
    return {};
  }

  async _executeBuy({ price, amount }) {
    let sig = null;
    if (this.poolAddress) {
      try { sig = await this.wallet.transferSOL(this.poolAddress, amount); } catch {}
    }
    this.state.position += amount / price;
    const trade = { type: "buy", price, amount, timestamp: new Date().toISOString(), signature: sig };
    this.state.trades.push(trade);
    this.state.pnl -= amount;
    return trade;
  }

  async _executeSell({ price, amount }) {
    const solReceived = this.state.position * price;
    this.state.position = Math.max(0, this.state.position - amount / price);
    const trade = { type: "sell", price, solReceived, timestamp: new Date().toISOString(), signature: null };
    this.state.trades.push(trade);
    this.state.pnl += solReceived;
    return trade;
  }

  tradeSummary() {
    return {
      ...this.status(),
      trades: this.state.trades,
      oracle: {
        currentPrice: this.state.lastPrice,
        sma: this.oracle.sma(5),
        history: this.oracle.history,
      },
    };
  }
}

module.exports = TradingAgent;