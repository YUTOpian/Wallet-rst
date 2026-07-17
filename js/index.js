// index.js

import { appState } from "./config.js";

console.log("index.js loaded");

import { autoConnectSSS } from "./sss.js";
import { refreshAccount } from "./account.js";
import { sendTx } from "./transfer.js";
import { loadRecentTx, initLiveTx } from "./transactions.js";
import { initWebSocket } from "./ws.js";
import { initSdk } from "./sdk.js";
import { showPopup } from "./utils.js";



function checkSSSConnection() {

  if (!window.SSS || !window.SSS.activePublicKey) {

    showPopup(
      "SSS Extension とリンクしてください（アカウントを選択）",
      true
    );

  }

}




window.addEventListener("load", async () => {



  // SSS Extension 初期化待ち

  await new Promise(resolve => 
    setTimeout(resolve, 1000)
  );



  // ① SSS接続

  await autoConnectSSS();




  // ② SSS確認

  if (!window.SSS || !window.SSS.activePublicKey) {


    showPopup(
      "⚠️ SSS Extension とリンクしてください 🔗<br>Symbol アカウントを選択する必要があります。",
      true
    );


    return;


  }




  // ③ SDK初期化

  await initSdk();




  // アカウント情報取得

  await refreshAccount();






  // ================================
  // イベント登録
  // ================================




  // 更新ボタン

  document
    .getElementById("refresh-account")
    ?.addEventListener(
      "click",
      refreshAccount
    );





  // 送金実行

  document
    .getElementById("btn-transfer")
    ?.addEventListener(
      "click",
      sendTx
    );







  // =================================
  // 送金ボタン
  // 横スライド表示
  // =================================


  document
    .getElementById("send-btn")
    ?.addEventListener(
      "click",
      () => {


        const panel =
          document.getElementById(
            "send-panel"
          );


        const sendList =
          document.getElementById(
            "send-mosaic-list"
          );


        const mosaicList =
          document.getElementById(
            "mosaic-list"
          );



        if(
          panel &&
          sendList &&
          mosaicList
        ){


          console.log(
  "send panel",
  panel
);

console.log(
  "send list",
  sendList
);

console.log(
  "mosaic list",
  mosaicList
);

          // 保有モザイク一覧コピー

          sendList.innerHTML =
            mosaicList.innerHTML;



          // コピーしたモザイクにクリック処理追加

          sendList
            .querySelectorAll(
              ".mosaic-item"
            )
            .forEach(
              item => {


                item.addEventListener(
                  "click",
                  () => {


                    const id =
                      item
                      .querySelector(
                        ".mosaic-id"
                      )
                      ?.textContent;



                    console.log(
                      "送信モザイク選択:",
                      id
                    );



                    // 元の一覧をクリック

                    const original =
                      [
                        ...document
                        .querySelectorAll(
                          "#mosaic-list .mosaic-item"
                        )
                      ]
                      .find(
                        el =>
                        el
                        .querySelector(
                          ".mosaic-id"
                        )
                        ?.textContent === id
                      );



                    if(original){

                      original.click();

                    }



                    // スライドを閉じる

                    panel
                    .classList
                    .remove(
                      "active"
                    );


                  }
                );


              }
            );



          // 表示

          panel
          .classList
          .add(
            "active"
          );


        }


      }
    );









  // =================================
  // 送金スライド閉じる
  // =================================


  document
    .getElementById(
      "close-send-panel"
    )
    ?.addEventListener(
      "click",
      () => {


        document
        .getElementById(
          "send-panel"
        )
        ?.classList
        .remove(
          "active"
        );


      }
    );









  // =================================
  // 送金ポップアップ閉じる
  // =================================


  document
    .getElementById(
      "close-transfer-dialog"
    )
    ?.addEventListener(
      "click",
      () => {


        document
        .getElementById(
          "transfer-dialog"
        )
        .close();


      }
    );








  // =================================
  // トランザクション再読み込み
  // =================================


  document
    .getElementById(
      "reload-tx"
    )
    ?.addEventListener(
      "click",
      loadRecentTx
    );








  // =================================
  // アドレスコピー
  // =================================


  document
    .getElementById(
      "copy-address-btn"
    )
    ?.addEventListener(
      "click",
      () => {


        const addr =
          document
          .getElementById(
            "account-address"
          )
          .textContent;



        navigator.clipboard
        .writeText(addr)

        .then(
          () => {


            showPopup(
              "アドレスをコピーしました"
            );


          }
        )


        .catch(
          () => {


            showPopup(
              "コピーに失敗しました",
              true
            );


          }
        );


      }
    );








  // =================================
  // 接続後処理
  // =================================


  if(window.SSS?.activePublicKey){



    await loadRecentTx();




    initWebSocket(
      appState.currentAddress
      .toString()
    );




    initLiveTx(
      appState.currentAddress
      .toString()
    );


  }



});
