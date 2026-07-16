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


    const mosaics = data.account.mosaics || [];


// ============================
// ネームスペース取得
// ============================

const namespaceMap = {};

const mosaicIds = mosaics.map(m =>
  typeof m.id === "string"
    ? m.id.toUpperCase()
    : m.id.toString(16).toUpperCase()
);


try {

  const namespaceRes = await fetch(
    new URL(
      "/namespaces/mosaic/names",
      appState.NODE
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mosaicIds
      })
    }
  );


for (const item of namespaceData) {

    if (
      item.names &&
      item.names.length > 0
    ) {

      namespaceMap[item.mosaicId.toUpperCase()] =
        item.names[0];

    }

}

} catch(e) {

  console.warn(
    "ネームスペース取得失敗",
    e
  );

}


    /*
      モザイク情報保存
    */
    appState.mosaicInfo = {};



// モザイクID一覧
const mosaicIds = mosaics.map(m =>
  typeof m.id === "string"
    ? m.id.toUpperCase()
    : m.id.toString(16).toUpperCase()
);

const mosaicInfoMap = {};
const namespaceMap = {};

    
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
    モザイク情報
  */

  let divisibility = 0;
  let name = idHex;


  const mosaicInfo = mosaicInfoMap[idHex];


  /*
    XYMは固定
  */
  if (
    idHex === "6BED913FA20223F8" ||
    idHex === "72C0212E67A08BCE"
  ) {

    name = "XYM";
    divisibility = 6;


  } else {


    /*
      可分性取得
    */
    divisibility =
      mosaicInfo?.properties?.find(
        (p) => p.id === 1
      )?.value ?? 0;


    /*
      ネームスペース取得
      無ければID表示
    */
    name =
      namespaceMap[idHex] ??
      idHex;

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



  /*
    保有モザイク一覧へ追加
  */

  if (mosaicList) {

    const item = document.createElement("div");

    item.className = "mosaic-item";


    item.innerHTML = `
      <div class="mosaic-left">

        <div class="mosaic-name">
          ${name}
        </div>

        <div class="mosaic-id">
          ${idHex}
        </div>

      </div>


      <div class="mosaic-right">

        <div class="mosaic-amount">
          ${(amount / (10 ** divisibility)).toLocaleString()}
        </div>

      </div>
    `;



    item.onclick = () => {


      if (select) {
        select.value = idHex;
      }


      document.getElementById("selected-mosaic-id").value =
        idHex;


      document.getElementById("selected-mosaic-name").textContent =
        name;


      document.getElementById("selected-mosaic-balance").textContent =
        `${(amount / (10 ** divisibility)).toLocaleString()} ${name}`;



      document.getElementById("transfer-card")
        ?.scrollIntoView({
          behavior: "smooth"
        });


    };


    mosaicList.appendChild(item);

  }

}
