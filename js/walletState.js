// walletState.js
// 旧 config.js の appState（Symbol専用）を置き換える、マルチチェーン対応の状態管理。
//
// 設計方針:
//  - SSS Extensionは廃止。接続方式はニーモニック（ローカル署名）のみ。
//  - 秘密鍵・シードはメモリ上にのみ保持し、保存するのは暗号化ニーモニックのみ（既存踏襲）。
//  - wallets[chainId] は registry.js の CHAINS を元に動的生成する（通貨追加時にここを手で書き換えない）。

import { CHAINS } from "./chains/registry.js";

/**
 * @typedef {Object} WalletEntry
 * @property {string|null} address
 * @property {string|null} publicKey
 * @property {*} keyMaterial        署名用鍵情報（チェーン固有型）。メモリ上のみ。
 * @property {string|null} balance  フォーマット済み残高
 * @property {import("./chains/common/adapter.js").TxInfo[]} txList
 * @property {boolean} isLoading
 * @property {string|null} error
 * @property {*} [chainExtra]       チェーン固有の付随状態（例: XYMのfacade/nodeなど）。各adapterが自由に使う領域
 */

function createEmptyWalletEntry() {
  return {
    address: null,
    publicKey: null,
    keyMaterial: null,
    balance: null,
    txList: [],
    isLoading: false,
    error: null,
    chainExtra: null,
  };
}

export const walletState = {
  // ========================================================
  // 接続状態
  // ========================================================
  connectionMode: "mnemonic", // 現状これ以外の値は存在しない（SSS廃止）
  isUnlocked: false,

  // BIP39から生成したシード。ログアウト/タブクローズで破棄する。
  /** @type {Uint8Array|null} */
  seed: null,

  // アカウントインデックス（通貨共通。将来的に通貨ごとに変えたければ wallets 側に持たせる）
  accountIndex: 0,

  // ========================================================
  // 画面状態
  // ========================================================
  /** @type {string} 現在表示中のチェーンID（CHAINSのid） */
  activeChain: "xym",

  // ========================================================
  // 通貨ごとの状態
  // registry.js の CHAINS を元に自動生成する。
  // ========================================================
  /** @type {Object<string, WalletEntry>} */
  wallets: Object.fromEntries(CHAINS.map((c) => [c.id, createEmptyWalletEntry()])),
};

/**
 * ログアウト・鍵の破棄。
 * seed / keyMaterial をメモリから確実に消す。
 */
export function resetWalletState() {
  walletState.isUnlocked = false;
  walletState.seed = null;

  for (const chainId of Object.keys(walletState.wallets)) {
    walletState.wallets[chainId] = createEmptyWalletEntry();
  }
}

/**
 * @param {string} chainId
 * @returns {WalletEntry}
 */
export function getWallet(chainId) {
  const wallet = walletState.wallets[chainId];
  if (!wallet) {
    throw new Error(`未対応の通貨IDです: ${chainId}`);
  }
  return wallet;
}
