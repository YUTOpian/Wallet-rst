// chains/evm/index.js
// EVM系（Ethereum / Polygon / Kaia）共通 ChainAdapter 実装（未実装スタブ）
//
// 3通貨とも同一の鍵導出パス・署名アルゴリズムのため実装を共有し、
// meta.evmChainId と RPCエンドポイントだけを差し替える。
//
// 想定ライブラリ: ethers.js v6
//
// 要確認事項:
//  - RPCエンドポイント（無料公開RPC or Infura等API key前提か）
//  - 履歴取得手段（eth_getLogsのみでは不十分になりがち。Etherscan系API検討）

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
