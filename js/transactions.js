// transactions.js
import { appState, NetworkType } from "./config.js";
import { Address, PublicKey } from "symbol-sdk";
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
   Hex → UTF-8
============================================================ */
function decodeMessage(payload) {
  if (!payload) return "(no message)";

  let hex = payload;
  if (hex.startsWith("00")) hex = hex.slice(2);

  const arr = hex.match(/.{1,2}/g);
  if (!arr) return "(decode error)";

  try {
    const bytes = new Uint8Array(arr.map(h => parseInt(h, 16)));
    return new TextDecoder().decode(bytes);
  } catch {
    return "(decode error)";
  }
}

/* ============================================================
   モザイク情報取得
============================================================ */
function extractAmount(tx) {
  if (!tx.mosaics || tx.mosaics.length === 0) return null;

  const signer = (tx.signerPublicKey || "").toUpperCase();
  const myPub = (appState.currentPubKey || "").toUpperCase();
  const direction = signer === myPub ? "send" : "receive";

  const mosaics = tx.mosaics.map(mosaic => {
    const info = appState.mosaicInfo?.[mosaic.id];
    const divisibility = info?.divisibility ?? 0;
    const name = info?.name ?? mosaic.id;

    return {
      id: mosaic.id,
      name,
      amount: Number(mosaic.amount) / (10 ** divisibility)
    };
  });

  return { mosaics, direction };
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
   アクティビティカード作成
============================================================ */
export function createTxCard(txInfo) {
  const { hash, msg, state, timestamp, mosaics, direction, sender, recipient } = txInfo;
  const explorer = getExplorerUrl(hash);
  const label = direction === "receive" ? "受信" : "送信";

  let mosaicHtml = "";
  if (mosaics && mosaics.length > 0) {
    mosaicHtml = mosaics.map(mosaic => `
      <div class="tx-mosaic">
        <div>モザイク: ${mosaic.name}</div>
        <div>数量: ${mosaic.amount}</div>
      </div>
    `).join("");
  }

  return `
    <div class="tx-item ${state === "unconfirmed" ? "unconfirmed" : "confirmed"}" id="tx-${hash}" onclick="window.open('${explorer}','_blank')">
      <div class="tx-body">
        <div class="tx-title">${label}</div>
        <div class="tx-status">${state.toUpperCase()}</div>
        <div class="tx-address">送金元:<br>${sender ?? "---"}</div>
        <div class="tx-address">送金先:<br>${recipient ?? "---"}</div>
        ${mosaicHtml}
        <div class="tx-message">メッセージ:<br>${msg}</div>
        ${state === "confirmed" && timestamp ? `
          <div class="tx-time">🕒 ${formatTimestamp(timestamp)}</div>
        ` : ""}
      </div>
    </div>
  `;
}

/* ============================================================
   DOM追加
============================================================ */
function appendTx(txInfo) {
  const list = document.getElementById("tx-list");
  list.insertAdjacentHTML("afterbegin", createTxCard(txInfo));
}

const txMap = {};
const soundPlayed = {};

/* ============================================================
   UNCONFIRMED → CONFIRMED
============================================================ */
function promoteTx(hash, timestamp) {
  const el = document.getElementById(`tx-${hash}`);
  if (!el) return;

  el.classList.remove("unconfirmed");
  el.classList.add("confirmed");

  const status = el.querySelector(".tx-status");
  if (status) status.textContent = "CONFIRMED";

  if (!el.querySelector(".tx-time")) {
    el.querySelector(".tx-body").insertAdjacentHTML(
      "beforeend",
      `<div class="tx-time">🕒 ${formatTimestamp(timestamp)}</div>`
    );
  }
}

/* ============================================================
   直近10件ロード
============================================================ */
export async function loadRecentTx() {
  const el = document.getElementById("tx-list");
  el.textContent = "読み込み中…";

  const address = appState.currentAddress.toString();
  const url = `${appState.NODE}/transactions/confirmed?address=${address}&order=desc&limit=10`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (!json.data) {
      el.textContent = "履歴なし";
      return;
    }

    el.innerHTML = json.data.map(item => {
      const meta = item.meta;
      const tx = item.transaction;
      const amountInfo = extractAmount(tx);

      const txInfo = {
        hash: meta.hash,
        sender: amountInfo?.direction === "send" ? appState.currentAddress.toString() : tx.signerPublicKey,
        recipient: amountInfo?.direction === "send" ? tx.recipientAddress : appState.currentAddress.toString(),
        msg: decodeMessage(tx.message),
        state: "confirmed",
        timestamp: meta.timestamp,
        mosaics: amountInfo?.mosaics ?? [],
        direction: amountInfo?.direction ?? null
      };

      txMap[meta.hash] = txInfo;
      soundPlayed[meta.hash] = true;

      return createTxCard(txInfo);
    }).join("");

  } catch (e) {
    console.error(e);
    el.textContent = "読み込みエラー";
  }
}
