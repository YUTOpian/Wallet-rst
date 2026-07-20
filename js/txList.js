// txList.js
// 通貨共通の取引履歴カード描画。
// chains/common/adapter.js の TxInfo 形式（hash/direction/counterparty/amount/symbol/state/timestamp/message）
// を前提とする。旧 transactions.js の createTxCard はXYMのモザイク配列前提だったため、
// マルチチェーン向けにamount/symbolを単一値として扱う形に作り直している。
//
// TODO: チェーンごとのExplorer URL（例: mempool.space, etherscan, symbol.fyi等）を
//       registry.js に持たせて、カードタップで開けるようにする（現状は非対応）。

function formatTimestamp(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ja-JP", { hour12: false });
}

/**
 * @param {import("./chains/common/adapter.js").TxInfo} tx
 * @param {import("./chains/registry.js").ChainMeta} meta
 */
function createTxCard(tx, meta) {
  const label = tx.direction === "receive" ? "受信" : "送信";
  const amountClass = tx.direction === "receive" ? "tx-amount-receive" : "tx-amount-send";
  const stateClass = tx.state === "unconfirmed" ? "unconfirmed" : "confirmed";

  return `
    <div class="tx-item ${stateClass}" id="tx-${tx.hash}">
      <div class="tx-body">
        <div class="tx-title">${label}</div>
        <div class="tx-status">${tx.state.toUpperCase()}</div>
        <div class="tx-address">相手先:<br>${tx.counterparty ?? "---"}</div>
        <div class="${amountClass}">${tx.amount} ${tx.symbol ?? meta.symbol}</div>
        ${tx.message ? `<div class="tx-message">メッセージ:<br>${tx.message}</div>` : ""}
        ${tx.timestamp ? `<div class="tx-time">🕒 ${formatTimestamp(tx.timestamp)}</div>` : ""}
      </div>
    </div>
  `;
}

/**
 * @param {HTMLElement} container
 * @param {import("./chains/common/adapter.js").TxInfo[]} txList
 * @param {import("./chains/registry.js").ChainMeta} meta
 */
export function renderTxList(container, txList, meta) {
  if (!container) return;

  if (!txList || txList.length === 0) {
    container.textContent = "取引履歴はありません";
    return;
  }

  container.innerHTML = txList.map((tx) => createTxCard(tx, meta)).join("");
}
