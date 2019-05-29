exports.moduleIndex = function(bucket,pathMusic,indexFileName,minioClient,SCAN_METADATA){

  var Minio = require('minio')
  const mm = require('music-metadata')
  const util = require('util')
  var List = require("collections/list")
  var Deque = require("collections/deque")
  const { Readable } = require('stream')
  var Kefir = require("kefir")
  const extensionArray = require('./extensiones')

  //-------------
  const VERSIONDB = 1
  
  const properties = ["title","artist","album","year"]
  const track = ["no","of"]
  const disk = ["no","of"]
  const format = ["duration","lossless","bitrate","sampleRate","numberOfChannels","dataformat"]

//--------------- reactive version of indexServer

  var finList$ // es el stream que se activa cuando se ha terminado el listado
  var index$ // es el Stream con el listado


  finList$ = readDirectory(bucket,pathMusic);  //--- es es stream del listado
  index$ =readIndex(bucket,indexFileName);     //--- es el stream del indice (music.index)

  indexCompleto$ = index$.filter(x => x["flag"]=="EXISTENTE") //-- tiene indice
  indexNuevo$ = index$.filter(x => x["flag"]=="NUEVO")        //-- no tiene indice y por tanto debe escribir uno nuevo
  
  //--- crea todo un indice nuevo
  meta$ = Kefir.zip([finList$.take(1),indexNuevo$.take(1)])  
  .map( x => x[0])
  .flatten()
  .flatMapConcurLimit(x => loadObjectMinio(x.path,x.size,x.extension,x.id),2)
  

  meta$.onValue( x =>{
    console.log(x.id)
  })

  writeNewIndex$ = meta$.bufferWhile()
        .map( x => {
          return writeNewIndex(bucket,indexFileName,x,1)} )

  writeNewIndex$.onEnd( () =>{
    console.log("---- Fin creacion de indice")
  })

  //---- Si ya existe un indice, debe comparar el directorio con el indice para ver las diferencias
  diff$ = Kefir.zip([finList$.take(1),indexCompleto$.take(1)])
          .map( x => {
            let dir = x[0] //-- el directorio
            let index = x[1].data  //-- el indice
            let globalIndexId = x[1].globalIndexId // el id del indice leido
            return checkDifIndex(dir,index,globalIndexId)
          })
  
  newIndex$ = diff$.filter(x => x.estado=="ADDINDEX")
  indexOk$ = diff$.filter(x => x.estado=="SOLOINDEXOK")
  nada$ = diff$.filter(x => x.estado=="NADA")

//-------------------------- filtrado a newIndex$
  newMetadata$ = newIndex$.map(x =>x.dirNew) //--
              .flatten()
              .flatMapConcurLimit( x =>loadObjectMinio(x.path,x.size,x.extension,x.id),2)
              .bufferWhile()

  writeChangeIndex$ = Kefir.zip([newMetadata$,diff$])  
  
  writeChangeIndex$.onValue( x =>{
    let globalIndexId = x[1].globalIndexId
    let nuevoIndice = x[1].indexOk.concat(x[0])
    writeNewIndex(bucket,indexFileName,nuevoIndice,globalIndexId+1)
  })
  //-------------------------- filtrado a indexOk$
  writeIndexOk$ = indexOk$.map( x => {
    console.log("indexOk=",x.indexOk.length)
    writeNewIndex(bucket,indexFileName,x.indexOk,x.globalIndexId+1)
  })

  writeIndexOk$.onValue( x =>{
    console.log("-- updating index --")
  })

  //-------------------------- filtrado a nada$
  nada$.onValue( x => {
    console.log("-- Index without change -- No New Index")
  })

//---------------------------------------------------------------------------------

function readDirectory(bucket,pathMusic){
  let finList$ = Kefir.stream(emitter =>{
    let cont = 0
    let dirList = [];
    var stream = minioClient.listObjects(bucket,pathMusic, true)
    stream.on('data', function(obj) {
        let nombre = obj.name
        if(nombre!=undefined){
          let size = obj.size
          //console.log("Listando:"+nombre)
          let extension = checkIsValidExtension(nombre)
          if(size!=undefined && extension){
            myExtension = getExtension(nombre)
            console.log("Listado:"+cont)
            dirList.push({"path":nombre,"size":size,"extension":myExtension,"id":cont++})
          }
        }
  
    } )
  
    stream.on('error', function(err) {
      console.log(err)
      console.log("---FIN---")
    } )
  
    stream.on('end', function(obj) {
      emitter.value(dirList);
    } )
  
  })
  return finList$
}

  //--- Lista el indice de canciones actual
  function readIndex(bucket,indexFileName){
      let index$ = Kefir.stream(emitter =>{
      let size = 0
      let musicIndex = []
      let globalIndexId
      var tempChunk = ""
      minioClient.getObject(bucket, indexFileName, function(err, dataStream) {
        console.log("---Reading Index  ----")
        let firstLine = true
        if (err) {
          console.log("NUEVO")
          emitter.value({"flag":"NUEVO"})
          emitter.end()
          return index$
        }
        dataStream.on('data', function(chunk) {
          //console.log("Reading Chunk")
        
          let chunkStr = chunk.toString()
          let divChunk = chunkStr.split("\n")
          divChunk[0] = tempChunk + divChunk[0] //--- agrega el pedazo antes del salto de linea
          tempChunk = divChunk[divChunk.length-1]
          //console.log("***"+tempChunk)
          for (var i = 0, tam = divChunk.length-1; i < tam; i++){
            let temp = divChunk[i]
            
            if(firstLine){
                          //globalIndexId ojo definición de consecutivo porque ya existe.
            let data= JSON.parse(temp)
            let versionDb = data.version
            let registers = data.registers
            let id = data.id
            globalIndexId = id
            console.log("Version="+versionDb)
            console.log("Registers="+registers)
            console.log("globalIndexId="+id)
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

          emitter.value({"flag":"EXISTENTE","data":musicIndex,"globalIndexId":globalIndexId})
          emitter.end()
        })
        dataStream.on('error', function(err) {
          console.log(err)
        })
      })

    })
    return index$
  }


  //--- Creamos una función que carga una archivo de minio
  function loadObjectMinio(nombre,tamano,extension,id){
    return Kefir.stream(emitter =>{
      console.log("minio:",id)
      let validAudioExtension = isValidSongExtension(extension)
      if(SCAN_METADATA && validAudioExtension){
          let size = 0
          minioClient.getObject(bucket, nombre, function(err, dataStream) {
            let buffer = []; 
            if (err) {
                console.log("ERROR-Leyendo archivo"+nombre+" Error:"+err)
                emitter.end()
            }

            dataStream.on('data', function(chunk) {
              buffer.push(chunk)
              size += chunk.length
            })
            dataStream.on('end', function() {
              console.log('End. Total size = ' + size)
              mm.parseBuffer(Buffer.concat(buffer), 'audio/mpeg', { fileSize: tamano }).then( metadata => {
                  //console.log(util.inspect(metadata, { showHidden: false, depth: null }));

                  let temDatos = musicCommonMetadata(metadata,nombre,size,extension,id,validAudioExtension)
                  emitter.value(temDatos)
                  emitter.end()
                  //dataStream.destroy()
              });
            })
            dataStream.on('error', function(err) {
              console.log(err)
              emitter.end()
            })
          })
      }
      else{
        emitter.value(musicCommonMetadata({},nombre,tamano,extension,id,validAudioExtension))
        emitter.end()
      }


    })
  }


  function isValidSongExtension(ext){
    arreglo = extensionArray.audioExtensiones();
    return arreglo.includes(ext)
  }

  //--- copia los metadatos que nos interesan {Descarta la picture:} y otros sobre el tag 
  function musicCommonMetadata(inData,nombre,fileSize,extension,id,validAudioExtension){
    myObj = {"id":id,"path":nombre,"filesize":fileSize,"extension":extension}
    if(SCAN_METADATA && validAudioExtension){
        console.log("---metadata--- asigning, id=",id)
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
      }
      else{
        console.log("---metadata--- NO ENTER, id=",myObj.id)
      }
    return myObj
  }
    //--- escribe el listado de las canciones
    function writeNewIndex(bucket,indexFileName,listado,indexId){
      const inStream = new Readable({
        read() {}
      });
      
      minioClient.putObject(bucket, indexFileName, inStream, function(err, etag) {
        return console.log(err, etag) // err should be null
      })
  
      //--- la primera linea incluye una metadata en JSON con la version de la db, la cantidad de lineas que se van a cargar en el indice y con un consecutivo que identifica el orden de creación
      let firstLine = {version:VERSIONDB, registers:listado.length, id:indexId }
      inStream.push(JSON.stringify(firstLine)+"\n")
  
      for (var i = 0, tam = listado.length; i < tam; i++){
        inStream.push(JSON.stringify(listado[i])+"\n")
      }
      inStream.push(null);
      console.log("Escribiendo Listado a Index. Canciones="+listado.length)
    }

    function checkDifIndex(dirList,musicIndex,globalIndexId){
      let dirAddNew = []
      let indexOkList = []
      let diferentesAdd = 0
      let igualesAdd = 0
      dirList.forEach( (element , ind) => {
        //console.log(element.path + "="+checkIgual(element.path,musicIndex))
        if(checkIgual(element.path,musicIndex)){
        igualesAdd++
        }
        else{
          //-- porque es diferente
          dirAddNew.push(element)
          diferentesAdd++
        }
      })
      console.log("DIR->IndexDB iquals="+igualesAdd+" changes="+diferentesAdd)
  
      let diferentesOk = 0
      let igualesOk = 0
      musicIndex.forEach( element => {
        if(checkIgual(element.path,dirList)){
          indexOkList.push(element)
          igualesOk++
        }
        else{
          diferentesOk++
        }
      })
      console.log("IndexDB->dir iquals="+igualesOk+" changes="+diferentesOk)
      let estado = ""
      let checkIgualesOk = (igualesOk==musicIndex.length)

      if(checkIgualesOk && diferentesAdd==0) estado="NADA"
      if(!checkIgualesOk && diferentesAdd==0) estado="SOLOINDEXOK"
      if(diferentesAdd!=0) estado="ADDINDEX"
      return {"dir":dirList,"index":musicIndex,"dirNew":dirAddNew,"indexOk":indexOkList,"globalIndexId":globalIndexId,"estado":estado}
    }

    function checkIgual(nombre,arr){
      for (var i = 0, tam = arr.length; i < tam; i++) {
        if (arr[i].path === nombre) {
            return true;
        }
      }
      return false;
    }


  function checkIsValidExtension(nombre){
    let ext = nombre.substr(nombre.lastIndexOf('.') + 1);
    ext = ext.toLowerCase()
    let musicExtensions = extensionArray.allExtensiones();
    // for (i = 0 ; i < musicExtensions.length ; i++){
    //     if(musicExtensions[i]==ext) return true;
    // }
    return musicExtensions.includes(ext)
    //return false
  }

  function getExtension(nombre){
    let ext = nombre.substr(nombre.lastIndexOf('.') + 1);
    ext = ext.toLowerCase()
    return ext;
  }
}

