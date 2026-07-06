// transactions.js
import { appState, getXymMosaicIdHex } from "./config.js";
import { addCallback, getBlockTimestamp } from "./ws.js";

/* ============================================================
   Symbol timestamp → 人間時間
============================================================ */
function formatTimestamp(symbolTimestamp) {
  if (!symbolTimestamp || !appState.epochAdjustment) return "";
  const unixMs = appState.epochAdjustment * 1000 + Number(symbolTimestamp);
  return new Date(unixMs).toLocaleString("ja-JP", { hour12: false });
}

/* ============================================================
   Hex メッセージ → UTF-8
============================================================ */
function decodeMessage(payload) {
  if (!payload) return "(no message)";
  let hex = payload;
  if (hex.startsWith("00")) hex = hex.slice(2);

  const arr = hex.match(/.{1,2}/g);
  if (!arr) return "(decode error)";

  try {
    const bytes = new Uint8Array(arr.map((h) => parseInt(h, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return "(decode error)";
  }
}

/* ============================================================
   モザイク amount ＋ direction 抽出
============================================================ */
function extractMosaicAmount(tx, myAddress) {
  if (!tx.mosaics || tx.mosaics.length === 0) return null;

  const mosaic = tx.mosaics[0];
  const mosaicId = String(mosaic.id || "").toUpperCase();
  const rawAmount = Number(mosaic.amount);
  const xymId = getXymMosaicIdHex().toUpperCase();

  if (!mosaicId || Number.isNaN(rawAmount)) return null;

  // ▼ signer と自分の公開鍵で送信/受信を判定
  const signer = (tx.signerPublicKey || "").toUpperCase();
  const myPub = (appState.currentPubKey || "").toUpperCase();

  const direction = signer === myPub ? "send" : "receive";
  const isXym = mosaicId === xymId;

  return {
    amount: isXym ? rawAmount / 1_000_000 : rawAmount,
    mosaicLabel: isXym ? "XYM" : mosaicId,
    direction,
  };
}

/* ============================================================
   Explorer URL
============================================================ */
function getExplorerUrl(hash) {
  return appState.networkType === NetworkType.TESTNET
    ? `https://testnet.symbol.fyi/transactions/${hash}`
    : `https://symbol.fyi/transactions/${hash}`;
}

/* ============================================================
   1件の TX カード（ベースは壊さず最適化）
============================================================ */
export function createTxCard(txInfo) {
  const { hash, msg, state, timestamp, amount, mosaicLabel, direction } = txInfo;

  const explorer = getExplorerUrl(hash);

  let amountHtml = "";
  if (amount != null) {
    const color = direction === "receive" ? "#4ade80" : "#f87171"; // 緑 / 赤
    const label = direction === "receive" ? "受信" : "送信";

    amountHtml = `
      <div class="tx-amount" style="color:${color}; font-weight:bold;">
        ${label}: ${amount} ${mosaicLabel}
      </div>
    `;
  }

  return `
    <div class="tx-item ${state === "unconfirmed" ? "unconfirmed" : "confirmed"}"
         id="tx-${hash}"
         onclick="window.open('${explorer}', '_blank')">

      <div class="tx-body">
        <div class="tx-title">${msg}</div>
        <div class="tx-status">${state.toUpperCase()}</div>

        ${amountHtml}

        ${
          state === "confirmed" && timestamp
            ? `<div class="tx-time">🕒 ${formatTimestamp(timestamp)}</div>`
            : ""
        }
      </div>
    </div>
  `;
}

/* DOM 追加 */
function appendTx(txInfo) {
  const list = document.getElementById("tx-list");
  list.insertAdjacentHTML("afterbegin", createTxCard(txInfo));
}

const txMap = {};
const soundPlayed = {}; // ← 音の多重防止（1トランザクションにつき1回のみ）

/* ============================================================
   未承認 → 承認（昇格）
============================================================ */
function promoteTx(hash, timestamp) {
  const el = document.getElementById(`tx-${hash}`);
  if (!el) return;

  // 確実に UNCONFIRMED → CONFIRMED にする
  el.classList.remove("unconfirmed");
  el.classList.add("confirmed");

  const statusEl = el.querySelector(".tx-status");
  if (statusEl) statusEl.textContent = "CONFIRMED";

  // 時間表示（無ければ追加）
  if (!el.querySelector(".tx-time")) {
    el
      .querySelector(".tx-body")
      .insertAdjacentHTML(
        "beforeend",
        `<div class="tx-time">🕒 ${formatTimestamp(timestamp)}</div>`
      );
  }

}

/* ============================================================
   履歴ロード
============================================================ */
export async function loadRecentTx() {
  const el = document.getElementById("tx-list");
  el.textContent = "読み込み中…";

  const address = appState.currentAddress.toString();
  const url = `${appState.NODE}/transactions/confirmed?address=${address}&order=desc&limit=50`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (!json.data) {
      el.textContent = "履歴なし";
      return;
    }

    el.innerHTML = json.data
      .map((item) => {
        const meta = item.meta;
        const tx = item.transaction;

        const amountInfo = extractMosaicAmount(tx, address);

        const txInfo = {
          hash: meta.hash,
          signer: tx.signerPublicKey,
          msg: decodeMessage(tx.message),
          state: "confirmed",
          timestamp: meta.timestamp,
          amount: amountInfo?.amount ?? null,
          mosaicLabel: amountInfo?.mosaicLabel ?? null,
          direction: amountInfo?.direction ?? null,
        };

        txMap[meta.hash] = txInfo;
        soundPlayed[meta.hash] = true; // 既存履歴は音を鳴らさない

        return createTxCard(txInfo);
      })
      .join("");
  } catch (e) {
    el.textContent = "読み込みエラー";
  }
}

/* ============================================================
   Live Tx（WS）
============================================================ */
export function initLiveTx(address) {
  /* 未承認 */
  addCallback(`unconfirmedAdded/${address}`, (payload) => {
    const tx = payload.data;
    const hash = tx.meta.hash;

    if (txMap[hash]) return;

    const amountInfo = extractMosaicAmount(tx.transaction, address);

    const txInfo = {
      hash,
      signer: tx.transaction.signerPublicKey,
      msg: decodeMessage(tx.transaction.message),
      state: "unconfirmed",
      timestamp: null,
      amount: amountInfo?.amount ?? null,
      mosaicLabel: amountInfo?.mosaicLabel ?? null,
      direction: amountInfo?.direction ?? null,
    };

    txMap[hash] = txInfo;

    appendTx(txInfo);
  });

  /* 承認 */
  addCallback(`confirmedAdded/${address}`, async (payload) => {
    const tx = payload.data;
    const hash = tx.meta.hash;

    const blockTs = await getBlockTimestamp(tx.meta.height);

    if (!txMap[hash]) {
      const amountInfo = extractMosaicAmount(tx.transaction, address);

      const txInfo = {
        hash,
        signer: tx.transaction.signerPublicKey,
        msg: decodeMessage(tx.transaction.message),
        state: "confirmed",
        timestamp: blockTs,
        amount: amountInfo?.amount ?? null,
        mosaicLabel: amountInfo?.mosaicLabel ?? null,
        direction: amountInfo?.direction ?? null,
      };

      txMap[hash] = txInfo;

      appendTx(txInfo);
    } else {
      promoteTx(hash, blockTs);
    }
  });
}
