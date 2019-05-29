
var Kefir = require("kefir")
var Minio = require('minio')
const miModulo = require("./indexServer")
const miArrayExtensions = require("./extensiones")

const minio = true  //--- true for minio, false for Amazon S3 or a minio gateway with Google Storage Server or Microsoft azure
const SCAN_METADATA = true //--- false for only read the basic data from directory listing, no metadata but is very fast because doesn't need to read all files for extracting metadata
                           //--- true for read all file and extract metadata information

//--- Configuring Globals USE for minio on Google Cloud with minio gateway
// var bucket = "bogota2"                     //--- name of the bucket
// var pathMusic = "music/"                //--- path to the music library that you want to index
// var indexFileName = "music.index"       //--- leave a music.index (default)
// var minioClient = new Minio.Client({
//     endPoint: '192.168.0.16',            //--- IP of the Minio Music Server where the music library lives
//     port: 9000,                         //--- Port of the Minio server (9000 is default)
//     useSSL: false,                      //--- without SSL, put true for SSL access
//     accessKey: 'XXXXXXXXXXX',                 //---  Minio server Access key
//     secretKey: 'XXXXXXXXXXXXXXXXXXXXXXXX'       //---  Minio server Secret Key
// });

//--- Configuring Globals USE for minio
var bucket = "test"                     //--- name of the bucket
var pathMusic = "music/"                //--- path to the music library that you want to index
var indexFileName = "music.index"       //--- leave a music.index (default)
var minioClient = new Minio.Client({
    endPoint: '192.168.0.8',            //--- IP of the Minio Music Server where the music library lives
    port: 9000,                         //--- Port of the Minio server (9000 is default)
    useSSL: false,                      //--- without SSL, put true for SSL access
    accessKey: 'admin',                 //---  Minio server Access key
    secretKey: 'password'       //---  Minio server Secret Key
});

//--- Configuring Globals USE for S3  Comment in case you have Minio
// var bucket = "mipublico"                     //--- name of the bucket
// var pathMusic = "music/"                     //--- path to the music library that you want to index
// var indexFileName = "music.index"            //--- leave a music.index (default)
// var minioClient = new Minio.Client({
//     endPoint: 's3.amazonaws.com',            //--- IP of Amazon
//     accessKey: 'XXXXXXXXXXX',       //---  Amazon server Access key
//     secretKey: 'XXXXXXXXXXXXXXXXXXXXX'   //---  Amazon Secret Key
// });

if(!minio){
        //--- se ejecuta cuando es S3
        console.log("--Reindexing--")
        let exec=miModulo.moduleIndex(bucket,pathMusic,indexFileName,minioClient,SCAN_METADATA)
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
        .debounce(20000)
        .onValue( x =>{
                console.log("--Reindexing--")
                let exec=miModulo.moduleIndex(bucket,pathMusic,indexFileName,minioClient,SCAN_METADATA);

        })

}




