const AgentWallet = require("../src/wallet/AgentWallet");
const KeyVault = require("../src/wallet/KeyVault");
const WalletManager = require("../src/wallet/WalletManager");
const crypto = require("crypto");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n── ${name} ──`);
}

section("1. AgentWallet: create & export");
{
  const w = new AgentWallet({ network: "devnet", agentId: "test-wallet" });
  w.createWallet();
  assert(typeof w.publicKey === "string" && w.publicKey.length > 30, "publicKey is valid");
  assert(w.agentId === "test-wallet", "agentId set correctly");
  const sk = w.exportSecretKey();
  assert(typeof sk === "string" && sk.length > 60, "exportSecretKey returns string");
  const w2 = new AgentWallet({ network: "devnet", agentId: "test-2" });
  w2.loadFromSecretKey(sk);
  assert(w2.publicKey === w.publicKey, "loadFromSecretKey reconstructs same key");
}

section("2. AgentWallet: encrypted export/import");
{
  const w = new AgentWallet({ agentId: "enc-test" });
  w.createWallet();
  const original = w.publicKey;
  const blob = w.exportEncrypted("super-secret");
  assert(blob.includes("ciphertext"), "exportEncrypted returns blob");
  const w2 = new AgentWallet({ agentId: "enc-test" });
  w2.loadEncrypted(blob, "super-secret");
  assert(w2.publicKey === original, "loadEncrypted decrypts correctly");
  let threw = false;
  try {
    const w3 = new AgentWallet({ agentId: "bad" });
    w3.loadEncrypted(blob, "wrong-password");
  } catch { threw = true; }
  assert(threw, "Wrong passphrase throws error");
}

section("3. KeyVault");
{
  const masterSecret = crypto.randomBytes(32).toString("hex");
  const vault = new KeyVault({ masterSecret });
  const w = new AgentWallet({ agentId: "vault-test" });
  w.createWallet();
  const passphrase = vault.derivePassphrase("vault-test");
  const blob = w.exportEncrypted(passphrase);
  vault.store("vault-test", blob);
  assert(vault.has("vault-test"), "vault.has() returns true");
  assert(vault.retrieve("vault-test") === blob, "retrieve returns blob");
  const p2 = vault.derivePassphrase("vault-test");
  assert(p2 === passphrase, "derivePassphrase is deterministic");
  const pOther = vault.derivePassphrase("other-agent");
  assert(pOther !== passphrase, "Different agents get different passphrases");
  vault.delete("vault-test");
  assert(!vault.has("vault-test"), "delete removes entry");
}

console.log(`\n${"═".repeat(40)}`);
console.log(`Passed: ${passed}  |  Failed: ${failed}`);
console.log("═".repeat(40));
if (failed > 0) process.exit(1);