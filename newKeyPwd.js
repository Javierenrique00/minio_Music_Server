//------ CONFIGURE --------------------------------
let newPassword = "xxx"     //---- to set the newpassword
let newKeyFileName = "key2"  //---  name of the new key
//-------------------------------

const config = require("./config")
var Kefir = require("kefir")
var encripcion = require('./encripcion')
const { Readable } = require('stream')

let valores = config.constantes()
let minioClient = config.minioConection()


keyFile$ = readKeyFile(valores.bucket,valores.keyFileName,encripcion.sha256Only16bytes(valores.password))
keyFile$.onValue( x =>{
    // console.log("key:"+x.data)
    // console.log("iv:"+x.iv)
})

newPassword$ = keyFile$.map( x=>{
    return creatingKeyFile(valores.bucket,newKeyFileName,x.data,encripcion.sha256Only16bytes(newPassword))
})
newPassword$.onValue( x =>{
    console.log("New Key File:")
    console.log("key:"+x.data)
    console.log("iv:"+x.iv)
})

//-------------------------------------------------------------------------
function readKeyFile(bucket,keyFileName,PASSWORD){
    return Kefir.stream(emitter => {

      let file = []
      minioClient.getObject(bucket,keyFileName, function(err,dataStream){
        console.log("Looking for Key file...")
        if(err){
          console.log("---NO KEY FOUND ----")
          emitter.end()
          return
        }
        dataStream.on('data',function(chunk){
          file.push(chunk)
        })
        dataStream.on('end', function() {
        try{
            let data = Buffer.concat(file)
            let lectura = JSON.parse(data)
            let key = encripcion.desEncripta(lectura.data,PASSWORD,lectura.iv)
            emitter.value({data:key,iv:lectura.iv})
          }
          catch(ex){
            console.log("Error - Decrypting key file / bad password")
            console.log(ex.message)
          }
          emitter.end()
        })
        dataStream.on('error', function(err) {
          console.log(err)
          emitter.end()
        })
  
      })
    })
  }

  function creatingKeyFile(bucket,keyFileName,key,PASSWORD){
    
    console.log("-------------entering creating new key file")
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

    return myEncriptedKeyIV
  }