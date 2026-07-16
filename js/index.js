// index.js

import { appState } from "./config.js";

console.log("index.js loaded");

import { autoConnectSSS } from "./sss.js";
import { refreshAccount } from "./account.js";
import { sendTx } from "./transfer.js";
import { loadRecentTx, initLiveTx } from "./transactions.js";
import { initWebSocket } from "./ws.js";
import { initSdk } from "./sdk.js";
import { showPopup } from "./utils.js";

function checkSSSConnection() {
  if (!window.SSS || !window.SSS.activePublicKey) {
    showPopup("SSS Extension とリンクしてください（アカウントを選択）", true);
  }
}

window.addEventListener("load", async () => {

  // SSS Extension の初期化待ち
  await new Promise(resolve => setTimeout(resolve, 1000));

  // ① SSS 接続
  await autoConnectSSS();

  // ② SSS確認
  if (!window.SSS || !window.SSS.activePublicKey) {

    showPopup(
      "⚠️ SSS Extension とリンクしてください 🔗<br>Symbol アカウントを選択する必要があります。",
      true
    );

    return;
  }

  // ③ SDK を初期化
  await initSdk();

  // モザイク一覧・残高を取得
  await refreshAccount();

  // 初期選択（最初のモザイク）
  const mosaicSelect = document.getElementById("tx-mosaic");

  if (mosaicSelect && mosaicSelect.options.length > 0) {
    mosaicSelect.dispatchEvent(new Event("change"));
  }

  // ========= イベント登録 =========

  document.getElementById("refresh-account")
    ?.addEventListener("click", refreshAccount);

  document.getElementById("btn-transfer")
    ?.addEventListener("click", sendTx);

  document.getElementById("reload-tx")
    ?.addEventListener("click", loadRecentTx);

  document.getElementById("copy-address-btn")
    ?.addEventListener("click", () => {

      const addr =
        document.getElementById("account-address").textContent;

      navigator.clipboard.writeText(addr)
        .then(() => {
          showPopup("アドレスをコピーしました");
        })
        .catch(() => {
          showPopup("コピーに失敗しました", true);
        });

    });

  // プルダウン変更時
  mosaicSelect?.addEventListener("change", () => {

    const id = mosaicSelect.value;

    const info = appState.mosaicInfo[id];

    if (!info) return;

    document.getElementById("selected-mosaic-id").value = id;

    document.getElementById("selected-mosaic-name").textContent =
      info.name;

    document.getElementById("selected-mosaic-balance").textContent =
      `${(info.amount / (10 ** info.divisibility)).toLocaleString()} ${info.name}`;

  });

  // ⑤ 接続済みなら各種情報を読み込む
  if (window.SSS?.activePublicKey) {

    await loadRecentTx();

    initWebSocket(
      appState.currentAddress.toString()
    );

    initLiveTx(
      appState.currentAddress.toString()
    );

  }

});
