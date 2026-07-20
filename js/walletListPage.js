// walletListPage.js
// 通貨選択画面（wallet-list-page）の描画ロジック。
//
// index.htmlに8通貨分のカードを手書きせず、chains/registry.js の CHAINS を
// 唯一の情報源として動的に組み立てる。通貨が増減してもこのファイルは変更不要。
//
// 現時点ではUIの骨格のみ。実際の残高取得（各chain adapterのgetBalance呼び出し）や
// account-page側の汎用化（現状Symbol専用構造）は別タスクで対応する。

import { CHAINS } from "./chains/registry.js";
import { walletState } from "./walletState.js";

/**
 * chain-card 1件分のDOMを生成する（templateをclone）
 * @param {import("./chains/registry.js").ChainMeta} meta
 */
function buildChainCard(meta) {
  const template = document.getElementById("chain-card-template");
  const node = template.content.firstElementChild.cloneNode(true);

  node.dataset.chain = meta.id;

  const icon = node.querySelector(".chain-card-icon-img");
  icon.src = `./assets/coins/${meta.id}.svg`;
  icon.alt = meta.symbol;

  node.querySelector(".chain-card-name").textContent = meta.name;
  node.querySelector(".chain-card-balance-symbol").textContent = meta.symbol;

  if (meta.harvest) {
    const badge = node.querySelector(".chain-card-badge-harvest");
    badge.hidden = false;
  }

  return node;
}

/**
 * 1枚のカードの表示を walletState.wallets[chainId] の内容で更新する。
 * getBalance実装後、残高取得の都度これを呼ぶ想定。
 * @param {HTMLElement} cardEl
 * @param {string} chainId
 */
export function updateChainCard(cardEl, chainId) {
  const wallet = walletState.wallets[chainId];
  const valueEl = cardEl.querySelector(".chain-card-balance-value");

  cardEl.classList.remove("is-loading", "is-error");

  if (wallet.error) {
    cardEl.classList.add("is-error");
    valueEl.textContent = "取得失敗";
    return;
  }

  if (wallet.isLoading || wallet.balance === null) {
    cardEl.classList.add("is-loading");
    valueEl.textContent = "---";
    return;
  }

  valueEl.textContent = wallet.balance;
}

/**
 * 通貨選択画面全体を描画する。
 * @param {(chainId: string) => void} onSelectChain  カードタップ時に呼ばれるコールバック
 */
export function renderWalletList(onSelectChain) {
  const listEl = document.getElementById("chain-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  for (const meta of CHAINS) {
    const card = buildChainCard(meta);
    updateChainCard(card, meta.id);

    card.addEventListener("click", () => {
      walletState.activeChain = meta.id;
      onSelectChain?.(meta.id);
    });

    listEl.appendChild(card);
  }
}

/**
 * 合計残高表示の更新。
 * 現時点ではUSD換算などのレート取得は未実装のため、実装が入るまでプレースホルダーとする。
 */
export function updateWalletTotal() {
  const totalEl = document.getElementById("wallet-total-value");
  if (!totalEl) return;

  // TODO: 各wallet.balance × レートで合計を算出する（レート取得元は別途決める）
  totalEl.textContent = "未実装";
}
