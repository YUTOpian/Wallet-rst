// account.js
// アカウント残高・保有モザイク取得

import { appState } from "./config.js";
import { setStatus } from "./ui.js";


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


    const mosaics = data.account.mosaics || [];


    /*
      モザイク情報保存
    */
    appState.mosaicInfo = {};


    /*
      送信用プルダウン
    */
    const select = document.getElementById("tx-mosaic");

    if (select) {
      select.innerHTML = "";
    }


    for (const mosaic of mosaics) {

      const idHex =
        typeof mosaic.id === "string"
          ? mosaic.id.toUpperCase()
          : mosaic.id.toString(16).toUpperCase();


      const amount =
        Number(mosaic.amount ?? mosaic.quantity ?? 0);


      /*
        モザイク情報取得
      */

      let divisibility = 0;
      let name = idHex;


      try {

        const mosaicRes = await fetch(
          new URL(`/mosaics/${idHex}`, appState.NODE)
        );

        const mosaicData = await mosaicRes.json();


        const mosaicInfo =
          mosaicData.mosaic;


        divisibility =
          mosaicInfo.properties.find(
            (p) => p.id === 1
          )?.value ?? 0;


        name =
          mosaicData.id?.id === "6BED913FA20223F8"
            ? "XYM"
            : idHex;


      } catch(e) {

        console.warn(
          "モザイク情報取得失敗",
          idHex
        );

      }


      /*
        保存
      */

      appState.mosaicInfo[idHex] = {
        name,
        divisibility,
        amount
      };


      /*
        select追加
      */

      if(select){

        const option =
          document.createElement("option");


        option.value = idHex;

        option.textContent =
          `${name} (${amount / (10 ** divisibility)})`;


        select.appendChild(option);

      }

    }


    /*
      XYM表示
    */

    const xymId =
      appState.networkType === 152
        ? "72C0212E67A08BCE"
        : "6BED913FA20223F8";


    const xym =
      appState.mosaicInfo[xymId];


    document.getElementById("account-balance").textContent =
      xym
        ? `${xym.amount / (10 ** xym.divisibility)} XYM`
        : "0 XYM";


    setStatus(
      "account-status",
      "取得成功",
      "success"
    );


  } catch(e){

    console.error(e);

    setStatus(
      "account-status",
      "取得に失敗しました",
      "error"
    );

  }

}
