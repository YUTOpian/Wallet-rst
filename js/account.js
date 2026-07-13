// account.js
// アカウント残高の取得

import { appState, getXymMosaicIdHex } from "./config.js";
import { setStatus } from "./ui.js";

export async function refreshAccount() {
  if (!appState.NODE || !appState.currentAddress) return;

  setStatus("account-status", "残高取得中…");

  try {
    const address = appState.currentAddress.toString();

    document.getElementById("account-address").textContent = address;

    const res = await fetch(
      new URL(`/accounts/${address}`, appState.NODE)
    );
    const data = await res.json();

    const mosaics = data.account.mosaics || [];

    const targetId = getXymMosaicIdHex().toUpperCase();
    let xym = 0;

    mosaics.forEach((m) => {
      const idHex =
        typeof m.id === "string"
          ? m.id.toUpperCase()
          : (m.id?.toString(16) || "").toUpperCase();

      if (idHex === targetId) {
        const raw = Number(m.amount ?? m.quantity ?? 0);
        xym = raw / 1_000_000;
      }
    });

    document.getElementById("account-balance").textContent =
      xym.toLocaleString() + " XYM";

    setStatus("account-status", "取得成功", "success");
  } catch (e) {
    console.error(e);
    setStatus("account-status", "取得に失敗しました", "error");
  }
}
