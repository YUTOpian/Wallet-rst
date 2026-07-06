// account.js
// アカウント残高の取得

import { appState, getXymMosaicIdHex } from "./config.js";
import { setStatus } from "./ui.js";

function normalizeMosaicIdHex(id) {
  if (typeof id === "string") return id.toUpperCase();
  return (id?.toString(16) || "").toUpperCase().padStart(16, "0");
}

function formatMosaicAmount(rawAmount, divisibility) {
  const raw = BigInt(rawAmount || 0).toString().padStart(divisibility + 1, "0");
  if (divisibility === 0) return raw;

  const integerPart = raw.slice(0, -divisibility);
  const fractionPart = raw.slice(-divisibility).replace(/0+$/, "");
  return fractionPart ? `${integerPart}.${fractionPart}` : integerPart;
}

async function fetchMosaicInfos(mosaicIds) {
  if (mosaicIds.length === 0) return new Map();

  try {
    const res = await fetch(new URL("/mosaics", appState.NODE), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosaicIds }),
    });
    if (!res.ok) throw new Error("mosaic info batch failed");

    const data = await res.json();
    return new Map(
      (data || []).map((item) => [
        normalizeMosaicIdHex(item.mosaic?.id),
        item.mosaic,
      ])
    );
  } catch (e) {
    console.warn("mosaic info batch failed, fallback to single fetch", e);
    const entries = await Promise.all(
      mosaicIds.map(async (id) => {
        const res = await fetch(new URL(`/mosaics/${id}`, appState.NODE));
        if (!res.ok) return [id, null];
        const data = await res.json();
        return [id, data.mosaic || null];
      })
    );
    return new Map(entries);
  }
}

async function fetchMosaicNames(mosaicIds) {
  if (mosaicIds.length === 0) return new Map();

  try {
    const res = await fetch(new URL("/namespaces/mosaic/names", appState.NODE), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mosaicIds }),
    });
    if (!res.ok) throw new Error("mosaic names fetch failed");

    const data = await res.json();
    return new Map(
      (data || []).map((item) => [
        normalizeMosaicIdHex(item.mosaicId),
        item.names?.[0]?.name || "",
      ])
    );
  } catch (e) {
    console.warn("mosaic names fetch failed", e);
    return new Map();
  }
}

function updateMosaicSelect(mosaics) {
  const select = document.getElementById("tx-mosaic-select");
  if (!select) return;

  select.innerHTML = "";

  if (mosaics.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "送信できるモザイクがありません";
    select.appendChild(option);
    select.disabled = true;
    return;
  }

  select.disabled = false;

  mosaics.forEach((mosaic) => {
    const option = document.createElement("option");
    option.value = mosaic.id;
    option.textContent = `${mosaic.label} / 残高 ${mosaic.balance}`;
    select.appendChild(option);
  });
}

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

    const accountMosaics = data.account.mosaics || [];
    const mosaicIds = accountMosaics.map((m) => normalizeMosaicIdHex(m.id));
    const [mosaicInfoMap, mosaicNameMap] = await Promise.all([
      fetchMosaicInfos(mosaicIds),
      fetchMosaicNames(mosaicIds),
    ]);

    const targetId = getXymMosaicIdHex().toUpperCase();
    let xym = 0;

    appState.accountMosaics = accountMosaics.map((m) => {
      const idHex = normalizeMosaicIdHex(m.id);
      const rawAmount = String(m.amount ?? m.quantity ?? 0);
      const divisibility = Number(mosaicInfoMap.get(idHex)?.divisibility ?? 0);
      const namespaceName = mosaicNameMap.get(idHex);
      const label = idHex === targetId ? "XYM" : namespaceName || idHex;
      const balance = formatMosaicAmount(rawAmount, divisibility);

      if (idHex === targetId) {
        xym = Number(formatMosaicAmount(rawAmount, 6));
      }

      return {
        id: idHex,
        label,
        rawAmount,
        divisibility,
        balance,
      };
    }).sort((a, b) => {
      if (a.id === targetId) return -1;
      if (b.id === targetId) return 1;
      return a.label.localeCompare(b.label);
    });

    updateMosaicSelect(appState.accountMosaics);

    document.getElementById("account-balance").textContent =
      xym.toLocaleString() + " XYM";

    setStatus("account-status", "取得成功", "success");
  } catch (e) {
    console.error(e);
    setStatus("account-status", "取得に失敗しました", "error");
  }
}
