// chains/common/adapter.js
// 全チェーンアダプタが実装すべき共通インターフェース定義（JSDoc型のみ、実体を持たない）。
// UI/walletState 側はこの形にだけ依存し、通貨固有の実装詳細を知らなくてよいようにする。

/**
 * @typedef {Object} DerivedAccount
 * @property {string} address
 * @property {string} publicKey
 * @property {*} keyMaterial   署名に必要な秘密鍵情報。型はチェーンごとに異なる（secp256k1 KeyPair / ed25519 seed 等）。
 *                             メモリ上にのみ保持し、walletState外に漏らさない・保存しない。
 */

/**
 * @typedef {Object} BalanceInfo
 * @property {string} balance      表示用にフォーマット済みの残高文字列
 * @property {number} decimals
 * @property {*} raw               チェーン固有の生データ（デバッグ用）
 */

/**
 * @typedef {Object} TxInfo
 * @property {string} hash
 * @property {"send"|"receive"} direction
 * @property {string} counterparty   相手先アドレス
 * @property {string} amount
 * @property {string} symbol
 * @property {"confirmed"|"unconfirmed"|"failed"} state
 * @property {number|null} timestamp  unix ms
 * @property {string} [message]
 */

/**
 * @typedef {Object} SendParams
 * @property {string} recipient
 * @property {string} amount        人間可読の数量（例 "1.5"）
 * @property {string} [message]
 * @property {string} [assetId]     チェーン内で複数アセットを扱う場合（例: XYMのモザイクID）。単一アセットのチェーンは無視してよい
 */

/**
 * @typedef {Object} ChainAdapter
 *
 * @property {(seed: Uint8Array, accountIndex: number) => Promise<DerivedAccount>} deriveAccount
 *   BIP39シードとアカウントインデックスからアドレス・鍵を導出する。
 *
 * @property {(address: string) => Promise<BalanceInfo>} getBalance
 *
 * @property {(address: string, limit?: number) => Promise<TxInfo[]>} getRecentTx
 *
 * @property {(params: SendParams, fromAddress: string) => Promise<*>} buildSendTx
 *   未署名トランザクション（チェーン固有の中間形式）を組み立てる。
 *
 * @property {(unsignedTx: *, keyMaterial: *) => Promise<*>} signTx
 *   ローカル鍵で署名する。SSS等の外部署名器は使わない前提（廃止済み）。
 *
 * @property {(signedTx: *) => Promise<string>} broadcast
 *   ネットワークへ送信し、txハッシュを返す。
 *
 * @property {(address: string, onEvent: (tx: TxInfo) => void) => (() => void)} [subscribeLive]
 *   任意。WebSocket等でのライブ購読に対応するチェーンのみ実装。戻り値は購読解除関数。
 *
 * @property {() => Promise<void>} [init]
 *   任意。SDK読み込みやRPC疎通確認などチェーン固有の初期化が必要な場合に実装。
 */

/**
 * chains/<adapterFamily>/index.js を動的importし、ChainAdapterを取得する。
 * evm系(eth/polygon/kaia)やsymbolFamily系(xym/xem)のように、
 * 複数のChainMetaが同一実装を共有するケースを想定している。
 *
 * @param {import("../registry.js").ChainMeta} meta
 * @returns {Promise<ChainAdapter>}
 */
export async function loadAdapter(meta) {
  switch (meta.adapterFamily) {
    case "btc":
      return (await import("../btc/index.js")).createAdapter(meta);
    case "evm":
      return (await import("../evm/index.js")).createAdapter(meta);
    case "xrp":
      return (await import("../xrp/index.js")).createAdapter(meta);
    case "sol":
      return (await import("../sol/index.js")).createAdapter(meta);
    case "symbolFamily":
      return (await import("../symbolFamily/index.js")).createAdapter(meta);
    default:
      throw new Error(`未対応のadapterFamilyです: ${meta.adapterFamily}`);
  }
}
