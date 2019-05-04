var Kefir = require("kefir")
var Minio = require('minio')
const miModulo = require("./indexServer")


//--- Configuring Globals
var bucket = "test"                     //--- name of the bucket
var pathMusic = "music/"                //--- path to the music library that you want to index
var indexFileName = "music.index"       //--- leave a music.index (default)
var minioClient = new Minio.Client({
    endPoint: '192.168.0.8',            //--- IP of the Minio Music Server where the music library lives
    port: 9000,                         //--- Port of the Minio server (9000 is default)
    useSSL: false,                      //--- without SSL, put true for SSL access
    accessKey: 'admin',                 //---  Minio server Access key
    secretKey: 'password'               //---  Minio server Secret Key
});


//--- Crea el stream minioEvents$ cuando hay eventos de creación y eliminación de objetos
var minioEvents$ = Kefir.stream( emmiter => {
    var listener = minioClient.listenBucketNotification(bucket, 'music/', '.mp3', ['s3:ObjectCreated:*','s3:ObjectRemoved:*'])
    listener.on('notification', function(record) {
        console.log('%s event occurred (%s)', record.eventName, record.eventTime)
        emmiter.emit(1)
        //---listener.stop()
    })
    
})


//-- Debe invocar la recreación de un nuevo indice después de que pase 30 segundos sin hacer cambios a la estructura de archivos
var disable$ = minioEvents$
            .debounce(20000)
            .onValue( x =>{
                    console.log("--Activando indice--")

                    let exec=miModulo.moduleIndex(bucket,pathMusic,indexFileName,minioClient);

            })



