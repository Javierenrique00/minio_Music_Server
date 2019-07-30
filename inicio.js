
var Kefir = require("kefir")
var Minio = require('minio')
const miModulo = require("./indexServer")
const miArrayExtensions = require("./extensiones")
const encripcion = require("./encripcion")

//------------- CONFIGURATION 

const DEBOUNCEDELAY = 120000 //--- 120 seconds for reindexing if are changes in de files
const minio = false  //--- true for minio, false for Amazon S3 or a minio gateway with Google Storage Server or Microsoft azure
var SCAN_METADATA = true //--- false for only read the basic data from directory listing, no metadata but is very fast because doesn't need to read all files for extracting metadata
                           //--- true for read all file and extract metadata information
const ENCRYPTED = true    //--- True for encrypted index database, False no encryption
var PASSWORD = "xxx" //----Choose a password

//--- Configuring Globals USE for minio on Google Cloud with minio gateway
// var bucket = "bogota2"                     //--- name of the bucket
// var pathMusic = "data/"                //--- path to the music library that you want to index
// var indexFileName = "crypt.index"       //--- leave a music.index (default)
// var minioClient = new Minio.Client({
//     endPoint: '192.168.0.16',            //--- IP of the Minio Music Server where the music library lives
//     port: 9000,                         //--- Port of the Minio server (9000 is default)
//     useSSL: false,                      //--- without SSL, put true for SSL access
//     accessKey: 'GOOGBPT6F7Y2KKVMG3KOFXTO',                 //---  Minio server Access key
//     secretKey: '5wIW5p5MgRD7GHXsu6OMckDcBA1fZrp3Ya4+3zZ2'       //---  Minio server Secret Key
// });

//--- Configuring Globals USE for minio  Confioguraciona para acceso a Minio server local
var bucket = "cri"                     //--- name of the bucket
var pathMusic = "music/"                //--- path to the music library that you want to index
var indexFileName = "crypt.index"         //---Index file name
var keyFileName = "key"                   //--- Key File name
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

//--- Configuring Globals USE for minio on Backblaze and minio gateway
// var bucket = "orgpublicinfo99"                     //--- name of the bucket
// var pathMusic = "general/"                //--- path to the music library that you want to index
// var indexFileName = "music.index"       //--- leave a music.index (default)
// var minioClient = new Minio.Client({
//     endPoint: '192.168.0.16',            //--- IP of the Minio Music Server where the music library lives
//     port: 9000,                         //--- Port of the Minio server (9000 is default)
//     useSSL: false,                      //--- without SSL, put true for SSL access
//     accessKey: 'XXXXXXXXXXXXXX',                 //---  Minio server Access key
//     secretKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'       //---  Minio server Secret Key
// });


PASSWORD =  encripcion.sha256Only16bytes(PASSWORD) //-- Make 16 byte password
//console.log("Password="+PASSWORD.toString('hex'))
if(ENCRYPTED) SCAN_METADATA = true //-- force SCAN_METADATA if encrypted todo
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




