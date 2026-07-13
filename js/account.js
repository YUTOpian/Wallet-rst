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


        /*
          モザイク情報取得
        */
        try {

          const mosaicRes = await fetch(
            new URL(
              `/mosaics/${idHex}`,
              appState.NODE
            )
          );


          const mosaicData =
            await mosaicRes.json();


          const mosaicInfo =
            mosaicData.mosaic;



          divisibility =
            mosaicInfo?.properties?.find(
              (p) => p.id === 1
            )?.value ?? 0;



        } catch(e) {

          console.warn(
            "Mosaic情報取得失敗",
            idHex
          );

        }



        /*
          Namespace取得
        */
        try {

          const nsRes = await fetch(
            new URL(
              `/namespaces/mosaic/${idHex}`,
              appState.NODE
            )
          );


          const nsData =
            await nsRes.json();


          console.log(
            "Namespace DATA",
            idHex,
            nsData
          );


          if (
            nsData.data &&
            nsData.data.length > 0
          ) {


            const namespaceId =
              nsData.data[0].namespaceId;


            const nameRes =
              await fetch(
                new URL(
                  `/namespaces/${namespaceId}`,
                  appState.NODE
                )
              );


            const nameData =
              await nameRes.json();



            /*
              Symbol REST API v1形式
            */
            if (
              nameData.namespace?.name
            ) {

              displayName =
                nameData.namespace.name;

            }


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
        プルダウン追加
      */

      if(select){


        const option =
          document.createElement("option");


        option.value = idHex;


        option.textContent =
          `${displayName} (${(
            amount /
            (10 ** divisibility)
          ).toLocaleString()})`;



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

        ? `${(
            xym.amount /
            (10 ** xym.divisibility)
          ).toFixed(3)} XYM`

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
