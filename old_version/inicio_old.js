var Kefir = require("kefir")
var Minio = require('minio')
const { spawn } = require('child_process');

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

                    //--- crea un nuevo proceso para ejecutar el indice
                    const child = spawn('node',['indexServer.js']);

                    // child.stdout.on('data', (data) => {
                    //     console.log(data)
                    // })

                    child.stdout.pipe(process.stdout)

                    child.on('error', function (code, signal) {
                        console.log('child process ERROR with ' +
                                    `code ${code} and signal ${signal}`);
                      });

                      child.on('exit', function (code, signal) {
                        console.log('child process exited with ' +
                                    `code ${code} and signal ${signal}`);
                      });
                    

            })



