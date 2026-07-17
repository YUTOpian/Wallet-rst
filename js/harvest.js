// harvest.js
import { appState } from "./config.js";

/* ============================================================
   ハーベスト状態確認
============================================================ */
export async function checkHarvestStatus() {
  const statusEl = document.getElementById("harvest-status");
  if (!statusEl) return;

  try {
    const address = appState.currentAddress.toString();
    statusEl.textContent = "状態確認中...";

    // Symbol REST API: account info取得
    const url = `${appState.NODE}/accounts/${address}`;
    const res = await fetch(url);
    const json = await res.json();
    const account = json.account;

    if (!account) {
      statusEl.textContent = "アカウント情報取得失敗";
      return;
    }

    // importance確認 (0の場合はハーベスト条件未達または委任未設定)
    const importance = account.importance;

    if (importance && Number(importance) > 0) {
      statusEl.textContent = "✅ ハーベスト可能状態";
    } else {
      statusEl.textContent = "❌ ハーベスト未設定";
    }

  } catch (e) {
    console.error("Harvest status error:", e);
    statusEl.textContent = "状態取得エラー";
  }
}
