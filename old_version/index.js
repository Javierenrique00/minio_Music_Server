var Minio = require('minio')
const mm = require('music-metadata')
const util = require('util')
var List = require("collections/list")
var Deque = require("collections/deque")
const { Readable } = require('stream')

var minioClient = new Minio.Client({
    endPoint: '192.168.0.10',
    port: 9000,
    useSSL: false,
    accessKey: 'admin',
    secretKey: 'password'
});


//-- Lista el bucket
// minioClient.listBuckets(function(err, buckets) {
//     if (err) return console.log(err)
//     console.log('buckets :', buckets)
//   })

//----- Lista los objetos dentro de el bucket test

// var stream = minioClient.listObjects('test','', true)
// stream.on('data', function(obj) { console.log(obj) } )
// stream.on('error', function(err) { console.log(err) } )


//-- Muestra la notificacion  del Bucket

// minioClient.getBucketNotification('test', function(err, bucketNotificationConfig) {
//     if (err) return console.log(err)
//     console.log(bucketNotificationConfig)
//   })


//--Notifica la creación de un objeto dentro del bucket
// var listener = minioClient.listenBucketNotification('test', 'music/', '.mp3', ['s3:ObjectCreated:*'])
// listener.on('notification', function(record) {
//   // For example: 's3:ObjectCreated:Put event occurred (2016-08-23T18:26:07.214Z)'
//   console.log('%s event occurred (%s)', record.eventName, record.eventTime)
//   listener.stop()
// })

//--Crear un archivo en el FS como un stream
// const fs = require('fs');
// const file = fs.createWriteStream('./bigfile.txt');

// for(let i=0; i<= 1000; i++) {
//   file.write(i+' Esta es una linea\n');
// }
// file.end()

//--Crear un stream que se muestra en la pantalla
// const { Writable } = require('stream')
// const outStream = new Writable({
//   write(chunk, encoding , callback) {
//     console.log(chunk.toString())
//     callback()
//   }
// })
// process.stdin.pipe(outStream)

//-- Crea un stream writable que cuenta y se muestra en la pantalla
// const { Writable } = require('stream')
// const outStream = new Writable({
//   write(chunk, encoding , callback) {
//     console.log(chunk.toString())
//     callback()
//   }
// })
// outStream.write("Hola mundo. Escribo todo lo que estoy haciendo ahora...jajajaja\n")
// outStream.write("Esta es mi segunda linea....bien...ok\n")
// outStream.end()



//-- Crea un stream readable para enviarlo a minio

// const { Readable } = require('stream'); 
// const inStream = new Readable({
//   read() {}
// });

// minioClient.putObject('test', 'hola.txt', inStream, function(err, etag) {
//   return console.log(err, etag) // err should be null
// })

// inStream.push('ABCDEFGHIJKLM');
// inStream.push('NOPQRSTUVWXYZ');
// inStream.push(null);

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
  console.log("--chequeando el listado")
  dirList.forEach( (element , ind) => {
    //console.log(element.path + "="+checkIgual(element.path,musicIndex))
    if(checkIgual(element.path,musicIndex)){
    //------ ojojojojo
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

  //--- escribe el nuevo indice si no hay cambios ene el listado
  if(dirList.length == 0 && actIndex) writeNewIndex()
}

//--- Lista el indice de canciones actual
function readIndex(){
  let size = 0
  var tempChunk = ""
  minioClient.getObject('test', 'music.index', function(err, dataStream) {
    console.log("---Leyendo Indice music.index ----")
    if (err) {
      //---- Chequea si hay indice o nó
      if(musicIndex.length == 0){
        console.log("- No hay indice, por tanto hay que construirlo")
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
        musicIndex.push( JSON.parse(temp) )
      }
      size += chunk.length
    })
    dataStream.on('end', function() {
      //console.log('Tamano indice = ' + size)
      //--- Listado
      console.log("---------------------------------LISTADO-------------------------")
      for (var i = 0, tam = musicIndex.length; i < tam; i++){
        //console.log(JSON.stringify(musicIndex[i]));
      }
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
  
  minioClient.putObject('test', 'music.index', inStream, function(err, etag) {
    return console.log(err, etag) // err should be null
  })
  for (var i = 0, tam = listado.length; i < tam; i++){
    inStream.push(JSON.stringify(listado[i])+"\n");
  }
  inStream.push(null);
  console.log("Escribiendo Listado a Index. Canciones="+listado.length)
}


//--- copia los metadatos que nos interesan {Descarta la picture:} y otros sobre el tag 
//const commonMetadata = ["track","disk","title","artists","artist","album"]
function musicCommonMetadata(inData,nombre){
  let outData = {"path":nombre,"title":inData.common.title,"artist":inData.common.artist,"album":inData.common.album}
  //console.log("****"+ JSON.stringify(outData))
  return outData
}

function buscaDatosMinio(){
  //--console.log("buscando datos minio>"+dirList.length)
  if(dirList.length > 0){
    let obj = dirList.shift()
    loadObjectMinio(obj.path,obj.size)
  }
}


//--- Creamos una función que carga una archivo de minio
function loadObjectMinio(nombre,tamano){
  let size = 0
  minioClient.getObject('test', nombre, function(err, dataStream) {
    if (err) {
      return console.log(err)
    }

    // dataStream.on('data', function(chunk) {
    //   size += chunk.length
    // })
    dataStream.on('end', function() {
      console.log('End. Total size = ' + size)
    })
    dataStream.on('error', function(err) {
      console.log(err)
    })

        //---carga el stream a Music-Metadata
    mm.parseStream(dataStream, 'audio/mpeg', { fileSize: tamano })
      .then( metadata => {
        //console.log(util.inspect(metadata, { showHidden: false, depth: 1 })) 
        let temDatos = musicCommonMetadata(metadata,nombre)
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
}


function checkIsSong(nombre){
  let ext = nombre.substr(nombre.lastIndexOf('.') + 1);
  if(ext=="mp3") return true
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
//var stream = minioClient.listObjects('test','music/Movies/', true)
var stream = minioClient.listObjects('test','music/dir1/', true)
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
  console.log("---FIN DEL LISTADO---"+contList+" size:"+dirList.length)
  validList = true
  readIndex()
} )



