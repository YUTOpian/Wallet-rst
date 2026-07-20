// signer.js
// SSS Extension廃止に伴い、ニーモニック(ローカル署名)のみのシンプルな共通口に縮小。
//
// UI/送金画面側は通貨を意識せず requestSign(chainId, unsignedTx) だけを呼べばよい。
// 実際の署名処理はチェーンごとの adapter.signTx() にディスパッチする（案B）。

import { walletState, getWallet } from "./walletState.js";
import { getChainMeta } from "./chains/registry.js";
import { loadAdapter } from "./chains/common/adapter.js";

/**
 * @param {string} chainId
 * @param {*} unsignedTx  各chain adapterのbuildSendTxが返した中間形式
 * @returns {Promise<*>}  署名済みトランザクション（chain固有形式）
 */
export async function requestSign(chainId, unsignedTx) {
  if (!walletState.isUnlocked || !walletState.seed) {
    throw new Error("ニーモニックがロードされていません。再ログインしてください。");
  }

  const wallet = getWallet(chainId);
  if (!wallet.keyMaterial) {
    throw new Error(`[${chainId}] 鍵が未導出です。アカウントに接続してください。`);
  }

  const meta = getChainMeta(chainId);
  const adapter = await loadAdapter(meta);

  return adapter.signTx(unsignedTx, wallet.keyMaterial);
}
