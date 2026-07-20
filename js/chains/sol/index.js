// chains/sol/index.js
// Solana用 ChainAdapter 実装（未実装スタブ）
//
// 想定ライブラリ: @solana/web3.js + ed25519-hd-key
// 接続先: 公開RPC (例: api.mainnet-beta.solana.com) ※レート制限に注意

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
