// transfer.js
// モザイク送金トランザクション（SSS 署名）

import { appState } from "./config.js";
import { setStatus } from "./ui.js";

function decimalToAbsoluteAmount(amountStr, divisibility) {
  const normalized = amountStr.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("invalid amount");
  }

  const [integerPart, fractionPart = ""] = normalized.split(".");
  if (fractionPart.length > divisibility) {
    throw new Error("too many decimals");
  }

  const paddedFraction = fractionPart.padEnd(divisibility, "0");
  return BigInt(integerPart + paddedFraction);
}

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
  const selectedMosaicId = document.getElementById("tx-mosaic-select").value;
  const amountStr = document.getElementById("tx-amount").value.trim();
  const messageText = document.getElementById("tx-message").value || "";

  // ▼ 修正：amountStr === "" のときだけ弾く（0 は許可）
  if (!recipientRaw || !selectedMosaicId || amountStr === "") {
    setStatus("tx-status", "アドレス・モザイク・数量は必須です。", "error");
    return;
  }

  let recipientAddress;
  try {
    recipientAddress = new appState.sdkSymbol.Address(recipientRaw);
  } catch (e) {
    console.error(e);
    setStatus("tx-status", "宛先アドレスが不正です。", "error");
    return;
  }

  const selectedMosaic = appState.accountMosaics.find(
    (mosaic) => mosaic.id === selectedMosaicId
  );

  if (!selectedMosaic) {
    setStatus("tx-status", "送信するモザイクを選択してください。", "error");
    return;
  }

  let absoluteAmount;
  try {
    absoluteAmount = decimalToAbsoluteAmount(amountStr, selectedMosaic.divisibility);
  } catch (e) {
    console.error(e);
    setStatus(
      "tx-status",
      "数量が不正です。小数点以下の桁数も確認してください。",
      "error"
    );
    return;
  }

  const mosaics = [
    new appState.sdkSymbol.descriptors.UnresolvedMosaicDescriptor(
      new appState.sdkSymbol.models.UnresolvedMosaicId(BigInt("0x" + selectedMosaic.id)),
      new appState.sdkSymbol.models.Amount(absoluteAmount)
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
