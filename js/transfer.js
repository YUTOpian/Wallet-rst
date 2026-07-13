// transfer.js
// XYM 送金トランザクション（SSS 署名）

import { appState, getXymMosaicIdHex } from "./config.js";
import { setStatus } from "./ui.js";

export async function sendTx() {
  if (
    !appState.NODE ||
    !appState.currentAddress ||
    !appState.currentPubKey ||
    !appState.isSdkReady
  ) {
    setStatus("tx-status", "初期化が未完了です。", "error");
    return;
  }

  const recipientRaw = document.getElementById("tx-recipient").value.trim();
  const amountStr = document.getElementById("tx-amount").value;
  const messageText = document.getElementById("tx-message").value || "";

  // ▼ 修正：amountStr === "" のときだけ弾く（0 は許可）
  if (!recipientRaw || amountStr === "") {
    setStatus("tx-status", "アドレスと金額は必須です。", "error");
    return;
  }

  const recipientAddress = new appState.sdkSymbol.Address(recipientRaw);
  const amount = Number(amountStr);

  // ▼ 修正：NaN と負の値だけ禁止（0 は OK）
  if (Number.isNaN(amount) || amount < 0) {
    setStatus("tx-status", "金額が不正です。", "error");
    return;
  }

  const mosaicIdHex = getXymMosaicIdHex();
  const mosaicIdBigInt = BigInt("0x" + mosaicIdHex);

  const mosaics = [
    new appState.sdkSymbol.descriptors.UnresolvedMosaicDescriptor(
      new appState.sdkSymbol.models.UnresolvedMosaicId(mosaicIdBigInt),
      new appState.sdkSymbol.models.Amount(
        BigInt(Math.floor(amount * 1_000_000))
      )
    ),
  ];

  const msgBytes = new TextEncoder().encode(messageText);
  const payload = new Uint8Array([0x00, ...msgBytes]);

  const descriptor =
    new appState.sdkSymbol.descriptors.TransferTransactionV1Descriptor(
      recipientAddress,
      mosaics,
      payload
    );

  const tx = appState.facade.createTransactionFromTypedDescriptor(
    descriptor,
    appState.currentPubKey,
    100, // maxFee（簡易）
    60 * 60 // 期限（秒）
  );

  const txPayloadHex = appState.sdkCore.utils.uint8ToHex(tx.serialize());

  try {
    setStatus("tx-status", "SSSで署名待ち…");

    window.SSS.setTransactionByPayload(txPayloadHex);
    const signed = await window.SSS.requestSign();

    const jsonPayload = JSON.stringify({ payload: signed.payload });

    const res = await fetch(new URL("/transactions", appState.NODE), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: jsonPayload,
    });

    if (res.ok) {
      setStatus(
        "tx-status",
        `送金をアナウンスしました。ハッシュ: ${signed.hash}`,
        "success"
      );
    } else {
      console.error(await res.text());
      setStatus("tx-status", "アナウンスに失敗しました。", "error");
    }
  } catch (e) {
    console.error(e);
    setStatus("tx-status", "署名または送信に失敗しました。", "error");
  }
}
