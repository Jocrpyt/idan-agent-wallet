const AgentWallet = require("./AgentWallet");
const KeyVault = require("./KeyVault");

class WalletManager {
  constructor(opts = {}) {
    this.network = opts.network || "devnet";
    this.vault = new KeyVault({
      masterSecret: opts.masterSecret,
      storagePath: opts.vaultPath || null,
    });
    this._cache = new Map();
  }

  async createAgent(agentId) {
    if (this.vault.has(agentId)) {
      throw new Error(`Agent '${agentId}' already exists. Use getAgent() to retrieve it.`);
    }
    const wallet = new AgentWallet({ network: this.network, agentId });
    wallet.createWallet();
    const passphrase = this.vault.derivePassphrase(agentId);
    const blob = wallet.exportEncrypted(passphrase);
    this.vault.store(agentId, blob);
    this._cache.set(agentId, wallet);
    return wallet;
  }

  getAgent(agentId) {
    if (this._cache.has(agentId)) {
      return this._cache.get(agentId);
    }
    const blob = this.vault.retrieve(agentId);
    const passphrase = this.vault.derivePassphrase(agentId);
    const wallet = new AgentWallet({ network: this.network, agentId });
    wallet.loadEncrypted(blob, passphrase);
    this._cache.set(agentId, wallet);
    return wallet;
  }

  listAgents() {
    return this.vault.listAgents();
  }

  removeAgent(agentId) {
    this._cache.delete(agentId);
    this.vault.delete(agentId);
  }

  summary() {
    return this.listAgents().map((id) => {
      try {
        return this.getAgent(id).summary();
      } catch {
        return { agentId: id, error: "could not load" };
      }
    });
  }
}

module.exports = WalletManager;