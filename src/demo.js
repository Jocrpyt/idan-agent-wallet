require("dotenv").config();
const AgentWallet = require("./wallet/AgentWallet");
const TradingAgent = require("./agent/TradingAgent");

async function main() {
  console.log("=== IDAN — Single Agent Demo ===");

  // 1. Create wallet
  const wallet = new AgentWallet({ network: "devnet", agentId: "idan-trader" });
  wallet.createWallet();
  console.log(`Wallet created: ${wallet.publicKey}`);

  // 2. Fund via airdrop
  console.log("Requesting devnet airdrop...");
  try {
    await wallet.requestAirdrop(1);
    const balance = await wallet.getSOLBalance();
    console.log(`Balance after airdrop: ${balance} SOL`);
  } catch (e) {
    console.warn(`Airdrop unavailable (devnet rate limit). Continuing...`);
  // 3. Run trading agent for 3 ticks
  const agent = new TradingAgent({ wallet, maxTicks: 3, tickMs: 1500 });

  agent.on("perceived", ({ tick, observations }) =>
    console.log(`  [tick ${tick}] price=${observations.price.toFixed(4)} sma=${observations.sma.toFixed(4)} bal=${observations.balance.toFixed(4)} SOL`)
  );
  agent.on("decided", ({ tick, action }) =>
    console.log(`  [tick ${tick}] decision: ${action.type}`)
  );
  agent.on("acted", ({ tick, action, result }) =>
    console.log(`  [tick ${tick}] acted: ${action.type} | sig=${result.signature || "sim-only"}`)
  );

  await new Promise((resolve) => {
    agent.on("stopped", resolve);
    agent.start();
  });

  // 4. Print summary
  console.log("\n=== Transaction History ===");
  wallet.transactionHistory.forEach((tx, i) =>
    console.log(`  ${i + 1}. [${tx.type}] ${tx.signature} @ ${tx.timestamp}`)
  );

  console.log("\n=== Trading Summary ===");
  const summary = agent.tradeSummary();
  console.log(`  Trades: ${summary.state.trades.length}`);
  console.log(`  Sim P&L: ${summary.state.pnl.toFixed(6)} SOL`);

  console.log(`\nExplorer: https://explorer.solana.com/address/${wallet.publicKey}?cluster=devnet`);
}

main().catch(console.error);