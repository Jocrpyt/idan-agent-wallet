require("dotenv").config();
const crypto = require("crypto");
const WalletManager = require("./wallet/WalletManager");
const TradingAgent = require("./agent/TradingAgent");
const LiquidityAgent = require("./agent/LiquidityAgent");

const AGENT_PAIRS = 3;
const TICKS = 4;

async function fundWallet(wallet) {
  try { await wallet.requestAirdrop(1); } catch {}
}

async function main() {
  console.log("=== IDAN — Multi-Agent Demo ===");
  console.log(`Launching ${AGENT_PAIRS * 2} agents...\n`);

  const masterSecret = process.env.MASTER_SECRET || crypto.randomBytes(32).toString("hex");
  const manager = new WalletManager({ masterSecret, network: "devnet" });
  const agents = [];

  for (let i = 1; i <= AGENT_PAIRS; i++) {
    const traderId = `idan-trader-${i}`;
    const lpId = `idan-lp-${i}`;
    const [traderWallet, lpWallet] = await Promise.all([
      manager.createAgent(traderId),
      manager.createAgent(lpId),
    ]);
    await Promise.all([fundWallet(traderWallet), fundWallet(lpWallet)]);

    const trader = new TradingAgent({
      wallet: traderWallet,
      maxTicks: TICKS,
      tickMs: 2000 + i * 300,
      tradeAmountSOL: 0.0005,
    });

    const lp = new LiquidityAgent({
      wallet: lpWallet,
      maxTicks: TICKS,
      tickMs: 2500 + i * 300,
      rebalanceAmount: 0.0003,
    });

    agents.push({ trader, lp, pair: i });
  }

  console.log("All wallets ready. Starting agents...\n");

  const donePromises = agents.flatMap(({ trader, lp }) =>
    [trader, lp].map(
      (agent) => new Promise((res) => {
        agent.on("acted", (e) => console.log(`[${e.agentId}] Tick ${e.tick}: ${e.action.type}`));
        agent.on("stopped", res);
        agent.start();
      })
    )
  );

  await Promise.all(donePromises);

  console.log("\n=== Final Report ===");
  agents.forEach(({ trader, lp, pair }) => {
    console.log(`\nPair ${pair}:`);
    console.log(`  Trader: ${trader.wallet.publicKey}`);
    console.log(`  LP:     ${lp.wallet.publicKey}`);
    console.log(`  Trades: ${trader.state.trades.length}`);
    console.log(`  Rebalances: ${lp.state.rebalances}`);
  });

  console.log("\nDone.");
}

main().catch(console.error);