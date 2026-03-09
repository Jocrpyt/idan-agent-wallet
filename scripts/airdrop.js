require("dotenv").config();
const crypto = require("crypto");
const WalletManager = require("../src/wallet/WalletManager");

const agentId = process.argv[2] || process.env.AGENT_ID;
if (!agentId) {
  console.error("Usage: node scripts/airdrop.js <agentId>");
  process.exit(1);
}

(async () => {
  const masterSecret = process.env.MASTER_SECRET || crypto.randomBytes(32).toString("hex");
  const manager = new WalletManager({ masterSecret, network: "devnet", vaultPath: ".vault.json" });

  let wallet;
  if (manager.listAgents().includes(agentId)) {
    wallet = manager.getAgent(agentId);
  } else {
    console.log(`Creating new agent: ${agentId}`);
    wallet = await manager.createAgent(agentId);
  }

  console.log(`Agent:  ${agentId}`);
  console.log(`Pubkey: ${wallet.publicKey}`);
  console.log("Requesting airdrop...");

  await wallet.requestAirdrop(2);
  const bal = await wallet.getSOLBalance();
  console.log(`Balance: ${bal} SOL`);
  console.log(`Explorer: https://explorer.solana.com/address/${wallet.publicKey}?cluster=devnet`);
})().catch(console.error);