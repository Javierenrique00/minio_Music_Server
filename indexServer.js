exports.moduleIndex = function(bucket,pathMusic,indexFileName,minioClient,SCAN_METADATA,ENCRYPTED,PASSWORD,keyFileName){

  var Minio = require('minio')
  const mm = require('music-metadata')
  const util = require('util')
  var List = require("collections/list")
  var Deque = require("collections/deque")
  const { Readable } = require('stream')
  var Kefir = require("kefir")
  const extensionArray = require('./extensiones')
  var encripcion = require('./encripcion')

  //-------------
  var VERSIONDB = 1
  if(ENCRYPTED) VERSIONDB = 2
  
  const properties = ["title","artist","album","year"]
  const track = ["no","of"]
  const disk = ["no","of"]
  const format = ["duration","lossless","bitrate","sampleRate","numberOfChannels","dataformat"]

//--------------- reactive version of indexServer

  var finList$ // es el stream que se activa cuando se ha terminado el listado
  var index$ // es el Stream con el listado

  var readKey$ = readKeyFile(bucket,keyFileName,PASSWORD) //-- es el stream de la llave encriptada

  finList$ = readDirectory(bucket,pathMusic);  //--- es es stream del listado 
  index$ = readKey$.flatMap( x => readIndex(bucket,indexFileName,x.data,x.iv))  //--- es el stream del indice (music.index)


  indexCompleto$ = index$.filter(x => x["flag"]=="EXISTENTE") //-- tiene indice
  indexNuevo$ = index$.filter(x => x["flag"]=="NUEVO")        //-- no tiene indice y por tanto debe escribir uno nuevo
  
  //--- crea todo un indice nuevo

  meta$ = Kefir.combine([finList$.take(1),indexNuevo$.take(1)])
        .map( x =>{
        let param1=x[0]
        let param2=x[1]
        return recorreList(param1,param2)
        })
        .flatten()
   
  stream1$ = meta$.filter(x => x.dir.extsong)
              .flatMapConcat( x =>loadObjectMinio(x.dir.path,x.dir.size,x.dir.extension,x.dir.id,x.dir.extsong,x.dir.iv,x.dir.nameEnc,x.index.key))
              .bufferWhile()
  
  stream2$ = meta$.filter(x => !(x.dir.extsong))
            .flatMapConcat( x =>loadObjectMinio(x.dir.path,x.dir.size,x.dir.extension,x.dir.id,x.dir.extsong,x.dir.iv,x.dir.nameEnc,x.index.key))
            .bufferWhile()

  writeNewIndex$ = Kefir.merge([stream1$,stream2$])
                  .bufferWhile()
                  .map( x =>{
                    if(x[0]!=undefined && x[1]!=undefined) return writeNewIndex(bucket,indexFileName,x[0].concat(x[1]),1)
                    if(x[0]!=undefined && x[1]==undefined) return writeNewIndex(bucket,indexFileName,x[0],1)
                    return x
                  })

  writeNewIndex$.onEnd( () =>{
    //console.log("---- Fin creacion de indice")
  })

  //---- Si ya existe un indice, debe comparar el directorio con el indice para ver las diferencias
  diff$ = Kefir.zip([finList$.take(1),indexCompleto$.take(1)])
          .map( x => {
            let dir = x[0] //-- el directorio
            let index = x[1].data  //-- el indice
            let globalIndexId = x[1].globalIndexId // el id del indice leido
            let key = x[1].key
            return checkDifIndex(dir,index,globalIndexId,key)
          })
  
  newIndex$ = diff$.filter(x => x.estado=="ADDINDEX")
  indexOk$ = diff$.filter(x => x.estado=="SOLOINDEXOK")
  nada$ = diff$.filter(x => x.estado=="NADA")

//-------------------------- filtrado a newIndex$
  // newMetadata$ = newIndex$.map(x =>x.dirNew)
  //             .flatten()

  newMetadata$ = newIndex$.map( x =>{
    let param1 = x.dirNew
    let param2 = x.key
    //console.log("KKKKK="+JSON.stringify(x.dirNew))
    return recorreList(param1,param2)
  })
  .flatten()

  searchMetadata$ = newMetadata$.filter(x => x.dir.extsong)
                    .flatMapConcat( x =>loadObjectMinio(x.dir.path,x.dir.size,x.dir.extension,x.dir.id,x.dir.extsong,x.dir.iv,x.dir.nameEnc,x.index))
                    .bufferWhile()

  noMetadata$ = newMetadata$.filter(x => !(x.dir.extsong))
                  .flatMapConcat( x =>loadObjectMinio(x.dir.path,x.dir.size,x.dir.extension,x.dir.id,x.dir.extsong,x.dir.iv,x.dir.nameEnc,x.index))
                  .bufferWhile()

  une$ = Kefir.merge([searchMetadata$,noMetadata$])
        .bufferWhile()
        .map( x => {
          if(x[0]!=undefined && x[1]!=undefined) return x[0].concat(x[1])
          if(x[0]!=undefined && x[1]==undefined) return x[0]
        })

  writeChangeIndex$ = Kefir.zip([une$,diff$])  
  
  writeChangeIndex$.onValue( x =>{
    //console.log("----------------------------------- antes de escribir el indice")
    let globalIndexId = x[1].globalIndexId
    let nuevoIndice = x[1].indexOk.concat(x[0])
    nuevoIndice.forEach(it =>{
      //console.log("-"+JSON.stringify(it))
    })

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
            //--- creando el iv
            let iv = encripcion.genIV()
            let nameEnc = pathMusic + encripcion.md5(nombre) + ".encrypt"
            //console.log("Listado:"+cont)
            dirList.push({"path":nombre,"size":size,"extension":myExtension,"id":cont++,"extsong":isValidSongExtension(myExtension),"iv":iv,"nameEnc":nameEnc})
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

  //---Revisa si se ha generado el archivo de encripcion
  function readKeyFile(bucket,keyFileName,PASSWORD){
    return Kefir.stream(emitter => {
      let file = []
      minioClient.getObject(bucket,keyFileName, function(err,dataStream){
        console.log("Looking for Key file...")
        if(err){
          console.log("---NO KEY FOUND ----")
          console.log("- Creating KEY")
          let keyFile = creatingKeyFile(bucket,keyFileName,PASSWORD)
          emitter.value(keyFile)
          emitter.end()
          return
        }
        dataStream.on('data',function(chunk){
          file.push(chunk)
        })
        dataStream.on('end', function() {
          let data = Buffer.concat(file)

          //--desencripta el archivo recien leido
          //console.log("DESENCRIPCION:"+JSON.stringify(JSON.parse(data)))
          let lectura = JSON.parse(data)
          let key = encripcion.desEncripta(lectura.data,PASSWORD,lectura.iv)
          //console.log("Desencripcion key:"+key)
          emitter.value({data:key,iv:lectura.iv})
          emitter.end()
        })
        dataStream.on('error', function(err) {
          console.log(err)
          emitter.end()
        })
  
      })
    })
  }

  function creatingKeyFile(bucket,keyFileName,PASSWORD){
    let key = encripcion.genRandomKey() //--String base 64
    let iv = encripcion.genIV() //---base64
    let myEncriptedKeyIV = encripcion.encripta(key,iv,PASSWORD)
    const inStream = new Readable({
      read() {}
    })
    minioClient.putObject(bucket, keyFileName, inStream, function(err, etag) {
      return console.log(err, etag) // err should be null
    })
    inStream.push(JSON.stringify(myEncriptedKeyIV))
    inStream.push(null)
    return {data:key,iv:iv}
  }

  function recorreList(lista,indexResult){
    let salida = []
      lista.forEach( it =>{
        salida.push({dir:it,index:indexResult})
      })
      return salida
  }

  //--- Lista el indice de canciones actual
  function readIndex(bucket,indexFileName,key,iv){
    //console.log("read index key:"+key)
      let index$ = Kefir.stream(emitter =>{
      let musicIndex = []
      let size = 0
      let globalIndexId
      var tempChunk = ""
      minioClient.getObject(bucket, indexFileName, function(err, dataStream) {
        console.log("---Reading Index  ----")
        let firstLine = true
        if (err) {
          console.log("NUEVO")
          emitter.value({"flag":"NUEVO","key":key,"iv":iv})
          emitter.end()
          return index$
        }
        dataStream.on('data', function(chunk) {
          //console.log("------------------------------------------------------Reading Chunk")
        
          let chunkStr = chunk.toString()
          let divChunk = chunkStr.split("\n")
          divChunk[0] = tempChunk + divChunk[0] //--- agrega el pedazo antes del salto de linea
          tempChunk = divChunk[divChunk.length-1]
          //console.log("***"+tempChunk)
          for (var i = 0, tam = divChunk.length-1; i < tam; i++){
            let temp = divChunk[i]
            //console.log("index("+i+")=")
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
              if(ENCRYPTED){
                let parseData = JSON.parse(temp)
                let desEnc = encripcion.desEncripta(parseData.data,Buffer.from(key,"base64"),parseData.iv)
                musicIndex.push( JSON.parse(desEnc))
              }
              else{
                musicIndex.push( JSON.parse(temp) )
              }
              
            }
          }
          size += chunk.length
        })
        dataStream.on('end', function() {

          emitter.value({"flag":"EXISTENTE","data":musicIndex,"globalIndexId":globalIndexId,"key":key,"iv":iv})
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
  function loadObjectMinio(nombre,tamano,extension,id,validAudioExtension,iv,nameEnc,key){
    return Kefir.stream(emitter =>{
      console.log("minio:",id)
      // console.log("minio nombre:",nombre)
      // console.log("minio key:",key)
      // console.log("minio iv:",iv)
      // console.log("minio extension:",extension)

      if(SCAN_METADATA && validAudioExtension || ENCRYPTED){
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
              let todoBuffer = Buffer.concat(buffer)

              

              if(ENCRYPTED){
                let outEncript = parte1008Encript(todoBuffer,iv,key)
                //--- escribe el archivo encriptado el cual está segmentado en segmentos de 1024
                minioClient.putObject(bucket,nameEnc,Buffer.concat(outEncript),function(err,etag){
                  emitter.end()
                  return console.log(err, etag)
                })
              }

              mm.parseBuffer(todoBuffer, 'audio/mpeg', { fileSize: tamano }).then( metadata => {
                  //console.log(util.inspect(metadata, { showHidden: false, depth: null }));

                  let temDatos = musicCommonMetadata(metadata,nombre,size,extension,id,validAudioExtension,iv,nameEnc)
                  emitter.value({data: temDatos,key:key})
                  if(!ENCRYPTED) emitter.end()
                  // //--- prueba la desencripcion
                  // let fileEncripted = Buffer.concat(outEncript)
                  // let fileUnEncripted = parte1024DesEncript(fileEncripted,iv,PASSWORD)
                  // //--- parte en segmentos de 1024
                  // minioClient.putObject(bucket,nameEnc+".rec",Buffer.concat(fileUnEncripted),function(err,etag){
                  //   emitter.end()
                  //   return console.log(err, etag)
                  // })

              });

            })
            dataStream.on('error', function(err) {
              console.log(err)
              emitter.end()
            })
          })
      }
      else{
        console.log("-------------------- entrando a solo info básica no metadata")
        let temDatos = musicCommonMetadata({},nombre,tamano,extension,id,validAudioExtension,iv,nameEnc)
        emitter.value({data:temDatos,key:key})
        emitter.end()
      }

    })
  }

  //--- lo parte en segmentos de 1008 para que encriptado quede de 1024
  function parte1008Encript(arreglo,iv,key){
    //console.log("llave:"+key)
    let llave = Buffer.from(key,'base64')
    let loc = 0
    let tamMax = arreglo.length
    let outEncript = []
    let delta = 0
    while(loc<tamMax){
      if(loc+1008<tamMax){
        delta = 1008
      }
      else{
        delta = tamMax - loc
      }
      let chunk1008 = encripcion.encriptaBinary(arreglo.slice(loc,loc+delta),iv,llave)
      outEncript.push(chunk1008)
      // let comTam = chunk1008.length
      // if(comTam!=1024) console.log("Diferente de 1024 tam="+chunk1008.length)
      loc += delta
    } 
    return outEncript
  }

  function parte1024DesEncript(arreglo,iv,PASSWORD){
    let loc = 0
    let tamMax = arreglo.length
    let outEncript = []
    let delta = 0
    while(loc<tamMax){
      if(loc+1024<tamMax){
        delta = 1024
      }
      else{
        delta = tamMax - loc
      }
      let chunk1024 = encripcion.desEncriptaBinary(arreglo.slice(loc,loc+delta),iv,PASSWORD)
      outEncript.push(chunk1024)
      loc += delta
    } 
    return outEncript
  }


  function isValidSongExtension(ext){
    arreglo = extensionArray.audioExtensiones();
    return arreglo.includes(ext)
  }

  //--- copia los metadatos que nos interesan {Descarta la picture:} y otros sobre el tag 
  function musicCommonMetadata(inData,nombre,fileSize,extension,id,validAudioExtension,iv,nameEnc){
    myObj = {"id":id,"path":nombre,"filesize":fileSize,"extension":extension,"iv":iv,"nameEnc":nameEnc}
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
      console.log("Writing Index. files="+listado.length)

      for (var i = 0, tam = listado.length; i < tam; i++){
        if(ENCRYPTED){
          let encdata = encripcion.encripta(JSON.stringify(listado[i].data),listado[i].data.iv,Buffer.from(listado[i].key,"base64"))
          inStream.push(JSON.stringify(encdata)+"\n")
        }
        else{
          inStream.push(JSON.stringify(listado[i].data)+"\n")
        }
      }
      inStream.push(null);
      
    }

    function checkDifIndex(dirList,musicIndex,globalIndexId,key){
      let dirAddNew = []
      let indexOkList = []
      let diferentesAdd = 0
      let igualesAdd = 0
      //console.log("DIFFINDEX key="+key)
      // console.log("MUSICINDEX="+JSON.stringify(musicIndex))
      dirList.forEach( (element , ind) => {
        //console.log(element.path + "="+checkIgual(element.path,musicIndex))
        if(!checkIsValidEncriptExtension(element.extension)){
          if(checkIgual(element.path,musicIndex)){
            igualesAdd++
            }
            else{
              //-- porque es diferente
              dirAddNew.push(element)
              diferentesAdd++
            }
        }

      })
      console.log("===================================================================")
      console.log("DIR->IndexDB iquals="+igualesAdd+" changes="+diferentesAdd)
  
      let diferentesOk = 0
      let igualesOk = 0
      musicIndex.forEach( element => {
        if(checkIgual(element.path,dirList) || checkIgual(element.nameEnc,dirList)){
          indexOkList.push({data:element,"key":key})
          igualesOk++
        }
        else{
          diferentesOk++
        }

      })
      console.log("IndexDB->dir iquals="+igualesOk+" changes="+diferentesOk)
      console.log("===================================================================")
      let estado = ""
      let checkIgualesOk = (igualesOk==musicIndex.length)

      if(checkIgualesOk && diferentesAdd==0) estado="NADA"
      if(!checkIgualesOk && diferentesAdd==0) estado="SOLOINDEXOK"
      if(diferentesAdd!=0) estado="ADDINDEX"
      return {"dir":dirList,"index":musicIndex,"dirNew":dirAddNew,"indexOk":indexOkList,"globalIndexId":globalIndexId,"key":key,"estado":estado}
    }

    function checkIgual(nombre,arr){
      for (var i = 0, tam = arr.length; i < tam; i++) {
        //console.log("Check str1="+nombre+" str2="+arr[i].path + " str3="+arr[i].nameEnc)
        if (arr[i].path === nombre) {
            return true;
        }
        if (arr[i].nameEnc === nombre) {
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

  function checkIsValidEncriptExtension(ext){
    let valores = extensionArray.encriptionExtensiones()
    return valores.includes(ext.toLowerCase())
  
  }

  function getExtension(nombre){
    let ext = nombre.substr(nombre.lastIndexOf('.') + 1);
    ext = ext.toLowerCase()
    return ext;
  }
}

