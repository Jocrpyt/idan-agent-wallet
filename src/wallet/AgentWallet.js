const {
  Keypair,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  clusterApiUrl,
} = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount, transfer, getAccount } = require("@solana/spl-token");
const bs58 = require("bs58");
const crypto = require("crypto");
const logger = require("../utils/logger");

class AgentWallet {
  constructor(opts = {}) {
    this.network = opts.network || "devnet";
    this.agentId = opts.agentId || `agent-${crypto.randomUUID().slice(0, 8)}`;
    this.connection = new Connection(clusterApiUrl(this.network), "confirmed");
    this._keypair = null;
    this._encryptionKey = opts.encryptionKey || null;
    this.transactionHistory = [];
  }

  createWallet() {
    this._keypair = Keypair.generate();
    return { publicKey: this.publicKey, agentId: this.agentId };
  }

  loadFromSecretKey(secretKeyBase58) {
    const decoded = bs58.decode(secretKeyBase58);
    this._keypair = Keypair.fromSecretKey(decoded);
  }

  exportSecretKey() {
    this._assertReady();
    return bs58.encode(this._keypair.secretKey);
  }

  exportEncrypted(passphrase) {
    this._assertReady();
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const aesKey = crypto.scryptSync(passphrase, salt, 32);
    const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
    const secret = Buffer.from(this._keypair.secretKey);
    const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return JSON.stringify({
      iv: iv.toString("hex"),
      salt: salt.toString("hex"),
      authTag: authTag.toString("hex"),
      ciphertext: encrypted.toString("hex"),
    });
  }

  loadEncrypted(blob, passphrase) {
    const { iv, salt, authTag, ciphertext } = JSON.parse(blob);
    const aesKey = crypto.scryptSync(passphrase, Buffer.from(salt, "hex"), 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, "hex")), decipher.final()]);
    this._keypair = Keypair.fromSecretKey(new Uint8Array(decrypted));
  }

  get publicKey() {
    this._assertReady();
    return this._keypair.publicKey.toBase58();
  }

  async getSOLBalance() {
    this._assertReady();
    const lamports = await this.connection.getBalance(this._keypair.publicKey);
    return lamports / LAMPORTS_PER_SOL;
  }

  async getSPLBalance(mintAddress) {
    this._assertReady();
    try {
      const mint = new PublicKey(mintAddress);
      const ata = await getOrCreateAssociatedTokenAccount(this.connection, this._keypair, mint, this._keypair.publicKey);
      const acct = await getAccount(this.connection, ata.address);
      return Number(acct.amount);
    } catch { return 0; }
  }

  async signAndSend(transaction, additionalSigners = []) {
    this._assertReady();
    const signers = [this._keypair, ...additionalSigners];
    const sig = await sendAndConfirmTransaction(this.connection, transaction, signers);
    this._recordTx(sig, "custom");
    return sig;
  }

  async transferSOL(toAddress, amountSOL) {
    this._assertReady();
    const to = new PublicKey(toAddress);
    const lamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
    const { blockhash } = await this.connection.getLatestBlockhash();
    const tx = new Transaction({ recentBlockhash: blockhash, feePayer: this._keypair.publicKey }).add(
      SystemProgram.transfer({ fromPubkey: this._keypair.publicKey, toPubkey: to, lamports })
    );
    const sig = await sendAndConfirmTransaction(this.connection, tx, [this._keypair]);
    this._recordTx(sig, "sol-transfer", { to: toAddress, amountSOL });
    return sig;
  }

  async requestAirdrop(amountSOL = 1) {
    this._assertReady();
    const lamports = Math.min(amountSOL, 2) * LAMPORTS_PER_SOL;
    const sig = await this.connection.requestAirdrop(this._keypair.publicKey, lamports);
    await this.connection.confirmTransaction(sig, "confirmed");
    this._recordTx(sig, "airdrop", { amountSOL });
    return sig;
  }

  _assertReady() {
    if (!this._keypair) throw new Error(`[${this.agentId}] Wallet not initialised.`);
  }

  _recordTx(signature, type, meta = {}) {
    this.transactionHistory.push({ signature, type, timestamp: new Date().toISOString(), ...meta });
  }

  summary() {
    return {
      agentId: this.agentId,
      network: this.network,
      publicKey: this._keypair ? this.publicKey : null,
      txCount: this.transactionHistory.length,
    };
  }
}

module.exports = AgentWallet;