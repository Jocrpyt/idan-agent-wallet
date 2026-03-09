# IDAN — Unexplainable Power on the Chain

IDAN is a silent, autonomous on-chain agent that holds its own wallet, reads the market, makes decisions, and executes transactions — without asking permission.

A production-grade prototype demonstrating how AI agents can autonomously create wallets, sign transactions, manage funds, and interact with DeFi protocols on Solana — all without human intervention.

## Quick Start

```bash
git clone https://github.com/Jocrpyt/idan-agent-wallet
cd idan-agent-wallet
npm install
cp .env.example .env
npm run demo
What IDAN Does
Creates and manages wallets programmatically
Signs transactions autonomously — no human approval
Executes mean-reversion trading strategy
Manages liquidity pool rebalancing
Supports multiple agents running concurrently
Real-time monitoring dashboard
Commands
Command
Description
npm run demo
Single agent demo
npm run multi-agent
6 concurrent agents
npm run dashboard
Monitoring UI at localhost:3000
npm test
Run test suite
Built On
Solana Web3.js
AES-256-GCM key encryption
HKDF key derivation
Node.js 18+
Network
Solana Devnet