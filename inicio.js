var Kefir = require("kefir")
var Minio = require('minio')
const miModulo = require("./indexServer")
const miArrayExtensions = require("./extensiones")
const encripcion = require("./encripcion")
const config = require("./config")

let valores = config.constantes()

const DEBOUNCEDELAY = valores.debounceDelay 
const minio = valores.minio  
var SCAN_METADATA = valores.scanMetadata 
                           
const ENCRYPTED = valores.encrypted    
var PASSWORD = valores.password 
const keyFileName = valores.keyFileName
const bucket = valores.bucket
const pathMusic = valores.pathMusic
const indexFileName = valores.indexFileName
let minioClient = config.minioConection()

PASSWORD =  encripcion.sha256Only16bytes(PASSWORD) 
//console.log("Password="+PASSWORD.toString('hex'))
if(ENCRYPTED) SCAN_METADATA = true //-- force SCAN_METADATA if encrypted
if(!minio){
        //--- se ejecuta cuando es S3
        console.log("--Reindexing--")
        let exec=miModulo.moduleIndex(bucket,pathMusic,indexFileName,minioClient,SCAN_METADATA,ENCRYPTED,PASSWORD,keyFileName)
}
else{
        //--- para minio
        //--- Crea el stream minioEvents$ cuando hay eventos de creación y eliminación de objetos

        var minioEvents$ = []
        let extensiones = miArrayExtensions.allExtensiones();
        extensiones.forEach(element => {

                minioEvents$.push( Kefir.stream( emmiter => {
                        var listener = minioClient.listenBucketNotification(bucket, pathMusic, "." + element , ['s3:ObjectCreated:*','s3:ObjectRemoved:*'])
                        listener.on('notification', function(record) {
                        console.log('%s event occurred (%s)', record.eventName, record.eventTime)
                        emmiter.emit(1)
                        //---listener.stop()
                        })
                        
                }))

        });
        //---- lo agrega al pool
        var pool$ = Kefir.pool();
        minioEvents$.forEach(element => {
                pool$.plug(element)
                
        });

        var disable$ = pool$
        .debounce(DEBOUNCEDELAY)
        .onValue( x =>{
                console.log("--Reindexing--")
                let exec=miModulo.moduleIndex(bucket,pathMusic,indexFileName,minioClient,SCAN_METADATA,ENCRYPTED,PASSWORD,keyFileName);

        })

}
