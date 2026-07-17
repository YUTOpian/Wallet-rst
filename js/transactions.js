// transactions.js
import { appState, NetworkType } from "./config.js";
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
   XYM amount ＋ direction 抽出
============================================================ */
function extractAmount(tx) {
  if (!tx.mosaics || tx.mosaics.length === 0) return null;

  // 送信・受信を判定
  const signer = (tx.signerPublicKey || "").toUpperCase();
  const myPub = (appState.currentPubKey || "").toUpperCase();
  const direction = signer === myPub ? "send" : "receive";

  // すべてのモザイクを取得
  const mosaics = tx.mosaics.map((mosaic) => {
    const info = appState.mosaicInfo?.[mosaic.id];

    // divisibility が分からなければ 0 とする
    const divisibility = info?.divisibility ?? 0;

    // 名前が分からなければモザイクIDを表示
    const name = info?.name ?? mosaic.id;

    return {
      id: mosaic.id,
      name,
      amount: Number(mosaic.amount) / (10 ** divisibility),
    };
  });

  return {
    mosaics,
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

const {
  hash,
  msg,
  state,
  timestamp,
  mosaics,
  direction,
  sender,
  recipient,
} = txInfo;


  const explorer = getExplorerUrl(hash);



  const label =
    direction === "receive"
      ? "受信"
      : "送信";



  let mosaicHtml = "";



  if(
    mosaics &&
    mosaics.length > 0
  ){

    mosaicHtml =
      mosaics
      .map(
        (mosaic)=>{


          return `

          <div class="tx-mosaic">

            <div>
              モザイク:
              ${mosaic.name}
            </div>

            <div>
              数量:
              ${mosaic.amount}
            </div>

          </div>

          `;


        }
      )
      .join("");

  }


  return `

  <div
    class="tx-item ${state === "unconfirmed" ? "unconfirmed" : "confirmed"}"
    id="tx-${hash}"
    onclick="window.open('${explorer}', '_blank')">


    <div class="tx-body">


      <div class="tx-title">
        ${label}
      </div>



    <div class="tx-status">
  ${state.toUpperCase()}
</div>


<div class="tx-address">

  送金元:

  <br>

  ${sender ?? "---"}

</div>


<div class="tx-address">

  送金先:

  <br>

  ${recipient ?? "---"}

</div>



      <div class="tx-recipient">

        宛先:

        <br>

        ${recipient ?? "---"}

      </div>



      ${mosaicHtml}




      <div class="tx-message">

        メッセージ:

        <br>

        ${msg}

      </div>




      ${
        state === "confirmed" && timestamp
        ?
        `
        <div class="tx-time">

          🕒 ${formatTimestamp(timestamp)}

        </div>
        `
        :
        ""
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
const soundPlayed = {};

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
  const url = `${appState.NODE}/transactions/confirmed?address=${address}&order=desc&limit=10`;

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

        const amountInfo = extractAmount(tx);

        const txInfo = {
  hash: meta.hash,

  signer:
    tx.signerPublicKey,

  sender:
    tx.signerPublicKey,

  recipient:
    tx.recipientAddress,

  msg:
    decodeMessage(tx.message),

  state:
    "confirmed",

  timestamp:
    meta.timestamp,


  mosaics:
    amountInfo?.mosaics ?? [],


  direction:
    amountInfo?.direction ?? null,
};

        txMap[meta.hash] = txInfo;
        soundPlayed[meta.hash] = true;

        return createTxCard(txInfo);
      })
      .join("");

  } catch (e) {
    console.error(e);
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

    const amountInfo = extractAmount(tx.transaction);

    const txInfo = {
      hash,
      signer: tx.transaction.signerPublicKey,
      recipient: tx.transaction.recipientAddress,
      msg: decodeMessage(tx.transaction.message),
      state: "unconfirmed",
      timestamp: null,
      mosaics: amountInfo?.mosaics ?? [],
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

      const amountInfo = extractAmount(tx.transaction);

      const txInfo = {
        hash,
        signer: tx.transaction.signerPublicKey,
        msg: decodeMessage(tx.transaction.message),
        state: "confirmed",
        timestamp: blockTs,
        mosaics: amountInfo?.mosaics ?? [],
        direction: amountInfo?.direction ?? null,
      };

      txMap[hash] = txInfo;

      appendTx(txInfo);

    } else {

      promoteTx(hash, blockTs);

    }

  });
}
