// transfer.js
// モザイク送金トランザクション（SSS 署名）

import { appState } from "./config.js";
import { setStatus } from "./ui.js";
import { createPlainMessage } from "./message.js";
import { getRecipientPublicKey } from "./account.js";

export async function sendTx() {
  if (!appState.NODE || !appState.currentAddress || !appState.currentPubKey || !appState.isSdkReady) {
    setStatus("tx-status", "初期化が未完了です。", "error");
    return;
  }

  const recipientRaw = document.getElementById("tx-recipient").value.trim();
  const amountStr = document.getElementById("tx-amount").value;
  const messageText =
  document.getElementById("tx-message").value || "";

const encryptMessage =
  document.getElementById("tx-encrypt")?.checked || false;

  /* 選択されたモザイクID取得 */
  const selectedMosaicElement = document.getElementById("selected-mosaic-id");
  console.log("selected mosaic element:", selectedMosaicElement);

  const selectedMosaicId = selectedMosaicElement?.value;
  console.log("selected mosaic id:", selectedMosaicId);

  /* 入力チェック */
  if (!selectedMosaicId) {
    setStatus("tx-status", "モザイクを選択してください。", "error");
    return;
  }

  if (!recipientRaw || amountStr === "") {
    setStatus("tx-status", "アドレスと金額は必須です。", "error");
    return;
  }

const recipientAddress =
  new appState.sdkSymbol.Address(recipientRaw);


// 暗号化用：受信者公開鍵
const recipientPublicKey =
  await getRecipientPublicKey(
    recipientAddress
  );


const amount = Number(amountStr);

  if (Number.isNaN(amount) || amount < 0) {
    setStatus("tx-status", "金額が不正です。", "error");
    return;
  }

  /* 可分性取得 */
  const divisibility = appState.mosaicInfo?.[selectedMosaicId]?.divisibility ?? 0;

  /* モザイク生成 */
  const mosaicIdBigInt = BigInt("0x" + selectedMosaicId);
  const mosaics = [
    new appState.sdkSymbol.descriptors.UnresolvedMosaicDescriptor(
      new appState.sdkSymbol.models.UnresolvedMosaicId(mosaicIdBigInt),
      new appState.sdkSymbol.models.Amount(BigInt(Math.floor(amount * (10 ** divisibility))))
    )
  ];

/*
  メッセージ
*/

/*
  メッセージ
*/

let payload;


if (encryptMessage) {

  // SSS側で暗号化するためpayloadは通常メッセージなし
  payload =
    new Uint8Array();


} else {

  payload =
    createPlainMessage(messageText);

}
  /* トランザクション作成 */
  const descriptor = new appState.sdkSymbol.descriptors.TransferTransactionV1Descriptor(
    recipientAddress,
    mosaics, // 補足：元のコードの変数名 mosaics と一致させるため、ここは mosaics のはずです
    payload
  );

  const tx = appState.facade.createTransactionFromTypedDescriptor(
    descriptor,
    appState.currentPubKey,
    100,
    60 * 60
  );

  const txPayloadHex = appState.sdkCore.utils.uint8ToHex(tx.serialize());

  try {
   setStatus("tx-status", "SSSで署名待ち…");


  let signed;


  if (encryptMessage) {


    window.SSS.setEncryptedMessage(
    messageText,
    recipientPublicKey
    );


    signed =
      await window.SSS.requestSignEncription();


  } else {


    window.SSS.setTransactionByPayload(
      txPayloadHex
    );


    signed =
      await window.SSS.requestSign();


  }
    const jsonPayload = JSON.stringify({ payload: signed.payload });

    const res = await fetch(new URL("/transactions", appState.NODE), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: jsonPayload
    });

    if (res.ok) {
      setStatus("tx-status", `送金をアナウンスしました。ハッシュ: ${signed.hash}`, "success");
    } else {
      console.error(await res.text());
      setStatus("tx-status", "アナウンスに失敗しました。", "error");
    }
  } catch (e) {
    console.error(e);
    setStatus("tx-status", "署名または送信に失敗しました。", "error");
  }
}
