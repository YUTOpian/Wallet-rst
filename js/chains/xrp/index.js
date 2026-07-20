// chains/xrp/index.js
// XRP用 ChainAdapter 実装（未実装スタブ）
//
// 想定ライブラリ: xrpl.js
// 接続先: 公開JSON-RPC/WebSocket (例: s1.ripple.com)

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
