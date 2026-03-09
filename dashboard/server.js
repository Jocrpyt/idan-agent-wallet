require("dotenv").config({ path: "../.env" });
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const WalletManager = require("../src/wallet/WalletManager");
const TradingAgent = require("../src/agent/TradingAgent");
const LiquidityAgent = require("../src/agent/LiquidityAgent");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const masterSecret = process.env.MASTER_SECRET || crypto.randomBytes(32).toString("hex");
const manager = new WalletManager({ masterSecret, network: "devnet" });
const activeAgents = new Map();
const sseClients = new Set();

function broadcast(event, data) {
  const msg = `data: ${JSON.stringify({ event, data, ts: Date.now() })}\n\n`;
  sseClients.forEach((res) => res.write(msg));
}

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

app.get("/api/agents", (req, res) => {
  const list = manager.listAgents().map((id) => {
    const a = activeAgents.get(id);
    return a ? a.status() : { agentId: id, running: false };
  });
  res.json({ agents: list });
});

app.post("/api/agents", async (req, res) => {
  try {
    const { agentId, type = "trader" } = req.body;
    const id = agentId || `${type}-${Date.now()}`;
    const wallet = await manager.createAgent(id);
    wallet.requestAirdrop(1).catch(() => {});
    let agent;
    if (type === "liquidity") {
      agent = new LiquidityAgent({ wallet, maxTicks: 20, tickMs: 5000 });
    } else {
      agent = new TradingAgent({ wallet, maxTicks: 20, tickMs: 5000 });
    }
    ["perceived","decided","acted","error","started","stopped"].forEach((evt) => {
      agent.on(evt, (data) => broadcast(evt, data));
    });
    activeAgents.set(id, agent);
    res.json({ success: true, agentId: id, publicKey: wallet.publicKey });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/agents/:id", (req, res) => {
  const a = activeAgents.get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  res.json(a.status());
});

app.post("/api/agents/:id/start", (req, res) => {
  const a = activeAgents.get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  a.start();
  res.json({ success: true });
});

app.post("/api/agents/:id/stop", (req, res) => {
  const a = activeAgents.get(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  a.stop();
  res.json({ success: true });
});

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IDAN Dashboard running at http://localhost:${PORT}`);
});