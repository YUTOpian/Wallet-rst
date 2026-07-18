// message.js
// Symbol TransferTransaction メッセージ生成


export function createPlainMessage(messageText) {

  const msgBytes =
    new TextEncoder().encode(messageText || "");

  return new Uint8Array([
    0x00,
    ...msgBytes
  ]);

}


/*
 平文メッセージ生成
 ※暗号化処理は後でSSS側へ移す
*/
export async function createMessagePayload(
  messageText,
  encrypted,
  recipientPublicKey
) {

  return createPlainMessage(messageText);

}
