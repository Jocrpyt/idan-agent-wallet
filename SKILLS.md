# SKILLS.md — Agent Capability Manifest

> This file is intended to be read by AI agents and orchestration layers
> to understand the capabilities, interfaces, and constraints of IDAN.

## Identity

system:   idan-agent-wallet
version:  1.0.0
network:  devnet (configurable)
language: Node.js (18+)

## Core Capabilities

### 1. Wallet Management
- Create wallet programmatically
- Load from encrypted blob or secret key
- Export with AES-256-GCM encryption
- Manage N isolated wallets via WalletManager

### 2. Transaction Execution (autonomous)
- transferSOL(toAddress, amountSOL)
- transferSPL(mint, toAddress, amount)
- requestAirdrop(amountSOL)
- signAndSend(transaction)

### 3. Agent Types
- TradingAgent — mean-reversion vs 5-period SMA
- LiquidityAgent — constant-product pool rebalancing
- BaseAgent — extend to build custom agents

### 4. API
- REST: POST /api/agents, GET /api/agents/:id
- SSE:  GET /api/events (live event stream)

## Security
- AES-256-GCM encryption at rest
- HKDF-SHA256 per-agent key derivation
- Private keys never logged

## File Map
- src/wallet/AgentWallet.js
- src/wallet/KeyVault.js
- src/wallet/WalletManager.js
- src/agent/BaseAgent.js
- src/agent/TradingAgent.js
- src/agent/LiquidityAgent.js
- dashboard/server.js
- dashboard/public/index.html
- tests/run_tests.js