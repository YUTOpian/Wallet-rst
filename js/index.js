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





window.addEventListener("load", async () => {



  // SSS初期化待ち

  await new Promise(resolve =>
    setTimeout(resolve,1000)
  );





  // SSS接続

  await autoConnectSSS();





  if(
    !window.SSS ||
    !window.SSS.activePublicKey
  ){

    showPopup(
      "⚠️ SSS Extension とリンクしてください",
      true
    );

    return;

  }





  // SDK初期化

  await initSdk();





  // アカウント取得

  await refreshAccount();








  /*
  =================================
  ページ取得
  =================================
  */


  const accountPage =
    document.getElementById(
      "account-page"
    );


  const sendPage =
    document.getElementById(
      "send-page"
    );


  const transferPage =
    document.getElementById(
      "transfer-page"
    );





  /*
  =================================
  初期表示
  =================================
  */


  if(sendPage)
    sendPage.style.display="none";


  if(transferPage)
    transferPage.style.display="none";










  /*
  =================================
  送金ボタン
  account → send
  =================================
  */


  document
  .getElementById("send-btn")
  ?.addEventListener(
    "click",
    ()=>{


      accountPage.style.display="none";


      sendPage.style.display="block";



      const sendList =
        document.getElementById(
          "send-mosaic-list"
        );


      const mosaicList =
        document.getElementById(
          "mosaic-list"
        );



      // 保有モザイクコピー

      sendList.innerHTML =
        mosaicList.innerHTML;





      /*
      モザイククリック
      send → transfer
      */


      sendList
      .querySelectorAll(
        ".mosaic-item"
      )
      .forEach(item=>{


        item.addEventListener(
          "click",
          ()=>{


            const name =
              item.querySelector(
                ".mosaic-name"
              )
              ?.textContent;


            const id =
              item.querySelector(
                ".mosaic-id"
              )
              ?.textContent;


            const amount =
              item.querySelector(
                ".mosaic-amount"
              )
              ?.textContent;





            document
            .getElementById(
              "selected-mosaic-name"
            )
            .textContent =
              name;



            document
            .getElementById(
              "selected-mosaic-id"
            )
            .value =
              id;



            document
            .getElementById(
              "selected-mosaic-balance"
            )
            .textContent =
              amount;







            sendPage.style.display="none";


            transferPage.style.display="block";



          }
        );


      });



    }
  );









  /*
  =================================
  戻る
  send → account
  =================================
  */


  document
  .getElementById(
    "back-account"
  )
  ?.addEventListener(
    "click",
    ()=>{


      sendPage.style.display="none";


      accountPage.style.display="block";


    }
  );








  /*
  =================================
  戻る
  transfer → send
  =================================
  */


  document
  .getElementById(
    "back-send"
  )
  ?.addEventListener(
    "click",
    ()=>{


      transferPage.style.display="none";


      sendPage.style.display="block";


    }
  );









  /*
  =================================
  送金実行
  =================================
  */


  document
  .getElementById(
    "btn-transfer"
  )
  ?.addEventListener(
    "click",
    sendTx
  );










  /*
  =================================
  受け取り
  =================================
  */


  document
  .getElementById(
    "receive-btn"
  )
  ?.addEventListener(
    "click",
    ()=>{


      accountPage.style.display="none";


      document
      .getElementById(
        "receive-page"
      )
      .style.display="block";


    }
  );









  /*
  =================================
  コピー
  =================================
  */


  document
  .getElementById(
    "copy-address-btn"
  )
  ?.addEventListener(
    "click",
    ()=>{


      const addr =
        document
        .getElementById(
          "account-address"
        )
        .textContent;



      navigator.clipboard
      .writeText(addr)
      .then(()=>{


        showPopup(
          "アドレスをコピーしました"
        );


      });


    }
  );









  /*
  =================================
  TX読み込み
  =================================
  */


  await loadRecentTx();



  initWebSocket(
    appState.currentAddress.toString()
  );


  initLiveTx(
    appState.currentAddress.toString()
  );



});
