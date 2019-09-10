
                                            //------------- CONFIGURATION 
constantes = function(){
    let bucket = "test"                  //--- name of the S3 bucket
    let pathMusic = "music/"                 //--- path to the music library that you want to index
    let indexFileName = "music.index"       //---Index file name
    let endPoint= '192.168.195.253'            //--- IP of the Minio Music Server where the music library lives
    let port = 9000                         //--- Port of the Minio server (9000 is default port)
    let useSSL = false                      //--- without SSL, put true for SSL access
    let accessKey = 'admin'                  //---  Minio server Access key           
    let secretKey = 'password'                  //---  Minio server Secret Key
    let debounceDelay = '120000'            //--- 120 seconds for reindexing if are changes in de files
    let minio = false                       //--- true for minio, false for Amazon S3 or a minio gateway with Google Storage Server or Microsoft azure
    let scanMetadata = true                 //--- false for only read the basic data from directory listing, no metadata but is very fast because doesn't need to read all files for extracting metadata
                                            //--- true for read all file and extract metadata information
    let encrypted = false                    //--- True for encrypted index database, False no encryption
    let keyFileName = "xxxx"                 //--- FileName of the Key
    let password = "xxxxxx"                //--- Password for the encryption


    return ({
        "bucket":bucket,
        "password":password,
        "pathMusic":pathMusic,
        "indexFileName":indexFileName,
        "keyFileName":keyFileName,
        "endPoint":endPoint,
        "port":port,
        "useSSL":useSSL,
        "accessKey":accessKey,
        "secretKey":secretKey,
        "debounceDelay":debounceDelay,
        "minio":minio,
        "scanMetadata":scanMetadata,
        "encrypted":encrypted
     })
}

exports.constantes = function(){
    return constantes()
}

exports.minioConection = function(){
var Minio = require('minio')
let valores = constantes()
     
var minioClient = new Minio.Client({
    endPoint: valores.endPoint,            
    port: valores.port,                         
    useSSL: valores.useSSL,                      
    accessKey: valores.accessKey,               
    secretKey: valores.secretKey 
})

return minioClient

}