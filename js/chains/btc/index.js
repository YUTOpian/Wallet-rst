// chains/btc/index.js
// Bitcoin用 ChainAdapter 実装（未実装スタブ）
//
// 想定ライブラリ: bitcoinjs-lib + bip32 + tiny-secp256k1 (or @scure/btc-signer)
// 残高/履歴取得: mempool.space API or blockstream.info API

/**
 * @param {import("../registry.js").ChainMeta} meta
 * @returns {import("../common/adapter.js").ChainAdapter}
 */
export function createAdapter(meta) {
  return {
    async deriveAccount(seed, accountIndex) {
      throw new Error(`[${meta.id}] deriveAccount 未実装`);
    },
    async getBalance(address) {
      throw new Error(`[${meta.id}] getBalance 未実装`);
    },
    async getRecentTx(address, limit) {
      throw new Error(`[${meta.id}] getRecentTx 未実装`);
    },
    async buildSendTx(params, fromAddress) {
      throw new Error(`[${meta.id}] buildSendTx 未実装`);
    },
    async signTx(unsignedTx, keyMaterial) {
      throw new Error(`[${meta.id}] signTx 未実装`);
    },
    async broadcast(signedTx) {
      throw new Error(`[${meta.id}] broadcast 未実装`);
    },
  };
}
