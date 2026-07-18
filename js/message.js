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
  SSS Extensionによる暗号化メッセージ
*/
export async function createEncryptedMessage(
  messageText,
  recipientPublicKey
) {

  const encrypted =
    await window.SSS.encryptMessage(
      recipientPublicKey,
      messageText
    );


  return encrypted;

}


/*
  平文 / 暗号化 切替
*/
export async function createMessagePayload(
  messageText,
  encrypted,
  recipientPublicKey
) {

  if (encrypted) {

    return await createEncryptedMessage(
      messageText,
      recipientPublicKey
    );

  }


  return createPlainMessage(messageText);

}
