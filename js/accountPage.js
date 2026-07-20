// accountPage.js
// account-page（通貨個別画面）の通貨共通テンプレートを、
// chains/registry.js のメタ情報に応じて出し分けるコントローラ。
//
// これまでXYM専用に固定表示されていた「ステーキング」ボタンと
// 「保有トークン」タブを、meta.harvest / meta.multiAsset を見て
// 動的にshow/hideする。実際の残高・アドレス・履歴の描画（各chain
// adapterの呼び出し）はここでは行わず、呼び出し側（index.js想定）に委ねる。

import { getChainMeta } from "./chains/registry.js";

/**
 * account-page を指定チェーン用に初期化する。
 * ページ遷移のたびに呼ぶ想定（残高等の非同期取得より先に、まずレイアウトを整える）。
 *
 * @param {string} chainId
 */
export function setupAccountPage(chainId) {
  const meta = getChainMeta(chainId);

  // ---- タイトル ----
  const titleEl = document.getElementById("account-chain-name");
  if (titleEl) {
    titleEl.textContent = `${meta.name} (${meta.symbol})`;
  }

  // ---- ステーキングボタン：meta.harvest === true (現状XYMのみ) のときだけ表示 ----
  const harvestBtn = document.getElementById("harvest-btn");
  if (harvestBtn) {
    harvestBtn.hidden = !meta.harvest;
  }

  // ---- 保有トークンタブ：meta.multiAsset === true (現状XYMのみ) のときだけ表示 ----
  const multiAssetSection = document.getElementById("multi-asset-section");
  const activityContent = document.getElementById("activity-content");
  const tabToken = document.getElementById("tab-token");
  const tabActivity = document.getElementById("tab-activity");
  const tokenContent = document.getElementById("token-content");

  if (multiAssetSection) {
    multiAssetSection.hidden = !meta.multiAsset;
  }

  if (meta.multiAsset) {
    // タブ切替UIを使う通貨（XYM）: 初期状態は「保有トークン」タブをアクティブにする
    tabToken?.classList.add("active");
    tabActivity?.classList.remove("active");
    if (tokenContent) tokenContent.style.display = "block";
    if (activityContent) activityContent.style.display = "none";
  } else {
    // 単一アセット通貨: タブなし、アクティビティ（送受金履歴）だけを常時表示
    if (activityContent) activityContent.style.display = "block";
  }
}

/**
 * タブ切替（保有トークン⇔アクティビティ）。multiAsset通貨でのみ使われる。
 * 既存の index.js のタブ切替ロジックと同じ挙動をここに集約する。
 */
export function wireAccountTabs() {
  const tabToken = document.getElementById("tab-token");
  const tabActivity = document.getElementById("tab-activity");
  const tokenContent = document.getElementById("token-content");
  const activityContent = document.getElementById("activity-content");

  tabToken?.addEventListener("click", () => {
    tabToken.classList.add("active");
    tabActivity?.classList.remove("active");
    if (tokenContent) tokenContent.style.display = "block";
    if (activityContent) activityContent.style.display = "none";
  });

  tabActivity?.addEventListener("click", () => {
    tabActivity.classList.add("active");
    tabToken?.classList.remove("active");
    if (tokenContent) tokenContent.style.display = "none";
    if (activityContent) activityContent.style.display = "block";
  });
}
