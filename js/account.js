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
          : mosaic.id.toString(16).toUpperCase();



      // 最小単位量
      const amount =
        Number(
          typeof mosaic.amount === "object"
            ? mosaic.amount.value
            : (mosaic.amount ?? mosaic.quantity ?? 0)
        );



      let divisibility = 0;
      let name = idHex;
      let namespaceName = null;



      /*
        XYM判定
      */
      if (
        idHex === "6BED913FA20223F8" ||
        idHex === "72C0212E67A08BCE"
      ) {

        name = "XYM";
        divisibility = 6;


      } else {


        /*
          Mosaic情報取得
        */
        try {


          const mosaicIdDecimal =
            BigInt("0x" + idHex).toString();



          const mosaicRes = await fetch(
            new URL(
              `/mosaics/${mosaicIdDecimal}`,
              appState.NODE
            )
          );


          const mosaicData = await mosaicRes.json();


          const mosaicInfo = mosaicData.mosaic;



          /*
            可分性取得
          */
          divisibility =
            mosaicInfo?.properties?.find(
              (p) => p.id === 1
            )?.value ?? 0;



          /*
            Namespace取得
          */
          if (
            mosaicInfo?.names &&
            mosaicInfo.names.length > 0
          ) {

            namespaceName =
              mosaicInfo.names[0].name;

          }



          console.log(
            "MOSAIC:",
            idHex,
            "NAMESPACE:",
            namespaceName
          );


        } catch(e) {

          console.warn(
            "Mosaic情報取得失敗",
            idHex,
            e
          );

        }


      }




      /*
        保存
      */

      appState.mosaicInfo[idHex] = {

        name:
          name === "XYM"
            ? "XYM"
            : (namespaceName || idHex),

        divisibility,

        amount

      };





      /*
        プルダウン追加
      */

      if(select){


        const option =
          document.createElement("option");


        option.value = idHex;



        const displayName =
          (
            idHex === "6BED913FA20223F8" ||
            idHex === "72C0212E67A08BCE"
          )
          ? "XYM"
          : (namespaceName || idHex);



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



  } catch(e){


    console.error(e);


    setStatus(
      "account-status",
      "取得に失敗しました",
      "error"
    );


  }

}
