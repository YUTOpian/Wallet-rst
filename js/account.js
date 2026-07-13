/*
  Namespace取得
*/
try {


  const mosaicIdDecimal =
    BigInt("0x" + idHex).toString();



  const nsRes = await fetch(
    new URL(
      `/namespaces?mosaicId=${mosaicIdDecimal}`,
      appState.NODE
    )
  );



  const nsData =
    await nsRes.json();



  console.log(
    "Namespace API:",
    nsData
  );



  if (
    nsData.data &&
    nsData.data.length > 0
  ) {


    const namespace =
      nsData.data[0].namespace;



    if(namespace?.name){

      displayName =
        namespace.name;

    }

  }



} catch(e) {

  console.warn(
    "Namespace取得失敗",
    idHex,
    e
  );

}
