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
  SSS Extension 暗号化メッセージ
*/
export async function createEncryptedMessage(
  messageText,
  recipientPublicKey
) {

  await window.SSS.setEncryptedMessage(
    messageText,
    recipientPublicKey
  );


  const encrypted =
    await window.SSS.requestSignEncription();


  return encrypted.payload;

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
