
exports.moduleIndex = function(bucket,pathMusic,indexFileName,minioClient){

  var Minio = require('minio')
  const mm = require('music-metadata')
  const util = require('util')
  var List = require("collections/list")
  var Deque = require("collections/deque")
  const { Readable } = require('stream')

  const VERSIONDB = 1
  const musicExtensions = ["mp3","aiff","ape","wma","wmv","asf","flac","mp2","mpc","mp4","m4a","m4v","ogg","oga","mogg","wav","wma","wv"]
  const properties = ["title","artist","album","year"]
  const track = ["no","of"]
  const disk = ["no","of"]
  const format = ["duration","lossless","bitrate","sampleRate","numberOfChannels","dataformat"]


  function checkIgual(nombre,arr){
    for (var i = 0, tam = arr.length; i < tam; i++) {
      if (arr[i].path === nombre) {
          return true;
      }
    }
    return false;
  }

  function checkDifIndex(){
    let diferentes = 0
    let iguales = 0
    dirList.forEach( (element , ind) => {
      //console.log(element.path + "="+checkIgual(element.path,musicIndex))
      if(checkIgual(element.path,musicIndex)){
      iguales++
      }
      else{
        //-- porque es diferente
        dirAddNew.push(element)
        diferentes++
      }
    })
    console.log("DIR->IndexDB iguales="+iguales+" diferentes="+diferentes)

    diferentes = 0
    iguales = 0
    musicIndex.forEach( element => {
      if(checkIgual(element.path,dirList)){
        indexOkList.push(element)
        iguales++
      }
      else{
        diferentes++
      }
    })
    console.log("IndexDB->dir iguales="+iguales+" diferentes="+diferentes)

    return
  }

  function copiaMusicIndexToListado(){
    //--- limpia dirList para alimente la información a buscar en la metadata de las canciones
    let actIndex = false
    contAnalisis = 0
    contList = 0
    validList = true
    dirList = new Deque()
    dirAddNew.forEach(  element => {
      dirList.push(element)
    })

    //--copia el musicIndex corregido indexOkList al listado para cargar la metadata al listado
    if (indexOkList.length != musicIndex.length) actIndex = true
    listado = []
    indexOkList.forEach( element => {
      listado.push(element)
    })

    // musicIndex.forEach( element => {
    //   listado.push(element)
    // })
    contList = dirAddNew.length + listado.length

    //--- escribe el nuevo indice si hay cambios ene el listado
    if(dirList.length == 0 && actIndex) writeNewIndex()
  }

  //--- Lista el indice de canciones actual
  function readIndex(){
    let size = 0
    var tempChunk = ""
    minioClient.getObject(bucket, indexFileName, function(err, dataStream) {
      console.log("---Reading Index  ----")
      let firstLine = true;
      if (err) {
        //---- Chequea si hay indice o nó
        if(musicIndex.length == 0){
          console.log("- No hay indice, por tanto hay que construirlo")
          globalIndexId  = 0 //-- al no haber indice debe arrancar con 0
          buscaDatosMinio()
        }
        return
      }
      dataStream.on('data', function(chunk) {
        console.log("Reading Chunk")
      
        let chunkStr = chunk.toString()
        let divChunk = chunkStr.split("\n")
        divChunk[0] = tempChunk + divChunk[0] //--- agrega el pedazo antes del salto de linea
        tempChunk = divChunk[divChunk.length-1]
        //console.log("***"+tempChunk)
        for (var i = 0, tam = divChunk.length-1; i < tam; i++){
          let temp = divChunk[i]
          //console.log(temp)
          if(firstLine){
            //globalIndexId ojo definición de consecutivo porque ya existe.
            let data= JSON.parse(temp)
            let versionDb = data.version
            let registers = data.registers
            let id = data.id
            globalIndexId = id
            console.log("Version="+versionDb)
            console.log("Registers="+registers)
            console.log("id="+id)
            console.log("--------------")
            firstLine = false
          }
          else{
            musicIndex.push( JSON.parse(temp) )
          }
        
        }
        size += chunk.length
      })
      dataStream.on('end', function() {
        //console.log('Tamano indice = ' + size)
        //--- Listado
        // for (var i = 0, tam = musicIndex.length; i < tam; i++){
        //   console.log(JSON.stringify(musicIndex[i]));
        // }
        //---hay que actualizar las diferencias del indice
        checkDifIndex()
        copiaMusicIndexToListado()
        buscaDatosMinio()
        
      })
      dataStream.on('error', function(err) {
        console.log(err)
      })
    })

  }



  //--- escribe el listado de las canciones
  function writeNewIndex(){
    const inStream = new Readable({
      read() {}
    });
    
    minioClient.putObject(bucket, indexFileName, inStream, function(err, etag) {
      return console.log(err, etag) // err should be null
    })

    //--- la primera linea incluye una metadata en JSON con la version de la db, la cantidad de lineas que se van a cargar en el indice y con un consecutivo que identifica el orden de creación
    let firstLine = {version:VERSIONDB, registers:listado.length, id:globalIndexId+1 }
    inStream.push(JSON.stringify(firstLine)+"\n")

    for (var i = 0, tam = listado.length; i < tam; i++){
      inStream.push(JSON.stringify(listado[i])+"\n")
    }
    inStream.push(null);
    console.log("Escribiendo Listado a Index. Canciones="+listado.length)
  }


  //--- copia los metadatos que nos interesan {Descarta la picture:} y otros sobre el tag 
  function musicCommonMetadata(inData,nombre,fileSize){

    myObj = {"path":nombre,"filesize":fileSize}
    properties.forEach( val =>{
      myObj[val] = inData.common[val]
    })
    myObj["track_no"] = inData.common.track.no;
    myObj["track_of"] = inData.common.track.of;
    myObj["disk_no"] = inData.common.disk.no;
    myObj["disk_of"] = inData.common.disk.of;

    format.forEach( val =>{
      myObj[val] = inData.format[val]
    })
    return myObj
  }

  function buscaDatosMinio(){
    console.log("buscando datos minio>"+dirList.length) //----para chequear
    if(dirList.length > 0){
      let obj = dirList.shift()
      loadObjectMinio(obj.path,obj.size)
    }
  }


  //--- Creamos una función que carga una archivo de minio
  function loadObjectMinio(nombre,tamano){
    let size = 0
    console.log("Trayendo info cancion->",nombre)
    console.log("Tamano->",tamano)

  
    minioClient.getObject(bucket, nombre, function(err, dataStream) {
      var buffer = []; 
      if (err) {
        return console.log("ERROR-Leyendo archivo"+nombre+" Error:"+err)
      }

      dataStream.on('data', function(chunk) {
        buffer.push(chunk)
        size += chunk.length
      })
      dataStream.on('end', function() {
        console.log('End. Total size = ' + size)
        mm.parseBuffer(Buffer.concat(buffer), 'audio/mpeg', { fileSize: size }).then( metadata => {
            //console.log(util.inspect(metadata, { showHidden: false, depth: null }));

            let temDatos = musicCommonMetadata(metadata,nombre,size)
            listado.push(temDatos)
            console.log(temDatos)
            console.log(contAnalisis++ + "/"+contList)
            //---- sacó ya todos los datos de las canciones
            if(validList && contList==listado.length){
              console.log("---FIN DEL ANALISIS DE LAS CANCIONES---"+contList)
              writeNewIndex()
            }
            dataStream.destroy()
            //-- pide la próxima canción si quedan
            buscaDatosMinio()
        });
      })
      dataStream.on('error', function(err) {
        console.log(err)
      })
    })
  }


  function checkIsSong(nombre){
    let ext = nombre.substr(nombre.lastIndexOf('.') + 1);
    ext = ext.toLowerCase()

    for (i = 0 ; i < musicExtensions.length ; i++){
        if(musicExtensions[i]==ext) return true;
    }
    return false
  }


  //--- vamos a listar desde minio todas las canciones del primer nivel
  var dirAddNew = []
  var indexOkList = []
  var dirList = new Deque() //-- Es el listado de canciones que salen de hacer dir
  var contList = 0 //-- es el tamano del listado de canciones completo sin vacirase para el analisis.
  var contAnalisis = 0
  var validList = false
  var listado = []  //-- en el vector listado va a quedar toda la metadata de los albunes
  var musicIndex = []  //-- es el vector que guarda el indice de las canciones
  var globalIndexId = 0 //-- guarda el valor del indicador del indice actual

  var stream = minioClient.listObjects(bucket,pathMusic, true)
  stream.on('data', function(obj) {
      let nombre = obj.name
      if(nombre!=undefined){
        let size = obj.size
        //console.log("Listando:"+nombre)
        let extension = checkIsSong(nombre)
        if(size!=undefined && extension){
          dirList.push({"path":nombre,"size":size})
          contList++
        }
      }

  } )

  stream.on('error', function(err) {
    console.log(err)
    console.log("---FIN---")
  } )

  stream.on('end', function(obj) {
    console.log("---Listing Files---"+dirList.length)
    validList = true
    readIndex()
  } )

  return "hola"

}

