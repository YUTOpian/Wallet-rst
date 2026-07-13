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


    // モザイク情報保存
    appState.mosaicInfo = {};


    // 送信用プルダウン
    const select = document.getElementById("tx-mosaic");

    if (select) {
      select.innerHTML = "";
    }



    for (const mosaic of mosaics) {


      const idHex =
        typeof mosaic.id === "string"
          ? mosaic.id.toUpperCase()
          : BigInt(mosaic.id).toString(16).toUpperCase();



      // 最小単位量
      const amount =
        Number(
          typeof mosaic.amount === "object"
            ? mosaic.amount.value
            : mosaic.amount
        );



      let divisibility = 0;
      let displayName = idHex;



      /*
        XYM
      */
      if (
        idHex === "6BED913FA20223F8" ||
        idHex === "72C0212E67A08BCE"
      ) {

        displayName = "XYM";
        divisibility = 6;


      } else {


        const mosaicIdDecimal =
          BigInt("0x" + idHex).toString();



        /*
          モザイク情報取得
        */
        try {

          const mosaicRes = await fetch(
            new URL(
              `/mosaics/${mosaicIdDecimal}`,
              appState.NODE
            )
          );


          const mosaicData =
            await mosaicRes.json();


          const mosaicInfo =
            mosaicData.mosaic;


          divisibility =
            mosaicInfo?.properties?.find(
              p => p.id === 1
            )?.value ?? 0;



        } catch(e) {

          console.warn(
            "Mosaic情報取得失敗",
            idHex,
            e
          );

        }



        /*
          Namespace取得
        */
        try {


          const nsRes = await fetch(
            new URL(
              `/namespaces/mosaic/${mosaicIdDecimal}`,
              appState.NODE
            )
          );


          const nsData =
            await nsRes.json();



          console.log(
            "Namespace DATA:",
            nsData
          );



          if (
            nsData.id &&
            nsData.id !== ""
          ) {

            if (
              nsData.name
            ) {

              displayName =
                nsData.name;

            }

          }



          /*
            別形式対応
          */
          if (
            nsData.names &&
            nsData.names.length > 0
          ){

            displayName =
              nsData.names[0].name;

          }



        } catch(e) {

          console.warn(
            "Namespace取得失敗",
            idHex,
            e
          );

        }


      }




      /*
        保存
      */

      appState.mosaicInfo[idHex] = {

        name: displayName,

        divisibility,

        amount

      };




      /*
        プルダウン表示
      */

      if(select){


        const option =
          document.createElement("option");


        option.value = idHex;


        option.textContent =
          `${displayName} (${(amount / (10 ** divisibility)).toFixed(6)})`;


        select.appendChild(option);

      }


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



  } catch(e) {


    console.error(e);


    setStatus(
      "account-status",
      "取得に失敗しました",
      "error"
    );


  }

}
