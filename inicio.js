var Kefir = require("kefir")
var Minio = require('minio')
const miModulo = require("./indexServer")


//--- Configuring Globals
var bucket = "test"
var pathMusic = "music/"
var indexFileName = "music.index"
var minioClient = new Minio.Client({
    endPoint: '192.168.0.8',
    port: 9000,
    useSSL: false,
    accessKey: 'admin',
    secretKey: 'password'
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



