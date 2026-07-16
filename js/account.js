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
  保有モザイク一覧
*/
const mosaicList = document.getElementById("mosaic-list");

if (mosaicList) {
  mosaicList.innerHTML = "";
}

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


      /*
        最小単位量
      */
      const amount =
        Number(
          typeof mosaic.amount === "object"
            ? mosaic.amount.value
            : (mosaic.amount ?? mosaic.quantity ?? 0)
        );


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


        const mosaicInfo = mosaicData.mosaic;


        /*
          XYMは固定で可分性6
        */
        if (
          idHex === "6BED913FA20223F8" ||
          idHex === "72C0212E67A08BCE"
        ) {

          name = "XYM";
          divisibility = 6;


        } else {


          /*
            その他モザイクはAPIから取得
          */
          name = idHex;

          divisibility =
            mosaicInfo?.properties?.find(
              (p) => p.id === 1
            )?.value ?? 0;

        }


      } catch(e) {

        console.warn(
          "モザイク情報取得失敗",
          idHex
        );


        /*
          XYMの場合は失敗しても6固定
        */
        if (
          idHex === "6BED913FA20223F8" ||
          idHex === "72C0212E67A08BCE"
        ) {
          name = "XYM";
          divisibility = 6;
        }

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
        送信用プルダウン追加
      */

      if(select){

        const option =
          document.createElement("option");


        option.value = idHex;


        option.textContent =
          `${name} (${(amount / (10 ** divisibility)).toLocaleString()})`;


        select.appendChild(option);

      }

    }




    /*
  保有モザイク一覧へ追加
*/
if (mosaicList) {

  const item = document.createElement("div");

  item.className = "mosaic-item";

  item.innerHTML = `
    <div class="mosaic-left">
      <div class="mosaic-name">${name}</div>
      <div class="mosaic-id">${idHex}</div>
    </div>

    <div class="mosaic-right">
      <div class="mosaic-amount">
        ${(amount / (10 ** divisibility)).toLocaleString()}
      </div>
    </div>
  `;

  item.onclick = () => {

    // 既存のプルダウンも同期
    if (select) {
      select.value = idHex;
    }

    // 新UIへ反映
    document.getElementById("selected-mosaic-id").value = idHex;
    document.getElementById("selected-mosaic-name").textContent = name;
    document.getElementById("selected-mosaic-balance").textContent =
      `${(amount / (10 ** divisibility)).toLocaleString()} ${name}`;

    // 送金フォームへスクロール
    document.getElementById("transfer-card").scrollIntoView({
      behavior: "smooth"
    });

  };

  mosaicList.appendChild(item);

}

    /*
      XYM残高表示
    */

    const xymId =
      appState.networkType === 152
        ? "72C0212E67A08BCE"
        : "6BED913FA20223F8";


    const xym =
      appState.mosaicInfo[xymId];


    document.getElementById("account-balance").textContent =
  xym
    ? `${(xym.amount / (10 ** xym.divisibility)).toFixed(3)} XYM`
    : "0.000 XYM";



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
