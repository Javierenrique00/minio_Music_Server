# minio_Music_Server
Minio music Server is a nodejs program to control alibrary with music metadata in a Minio storage with an automatic index creation.

The idea is that you have your Music Library copied to a Minio server (just a bunch of .mp3 files), then the Minio Music Server program indexed all metadata from your music library when it detects a change in the library. The index is in a NDJSON format that is easy to find any song. I made a Android program to read the index and download music from your Minio server. (Android program is in developer stage, free version available)

----------------------
Instalation for server:
1- Install a working Minio instance. ( https://min.io/ ) S3 compatible storage.
2- Copy your music library to a bucket in the Minio Instance. (To access music from the Minio server to the android program you have to make the bucket public)
3- In any server you can install Node (Nodejs) 6 version or newer.
4- Copy the node server the program  minio_Music_server by cloning repository or copy javascript files from the repository (*.js , *.json) to your working directory (any directory for the javascript program)
5- Configure access to minio in the file inicio.js change in accordance to your configuration
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
6- From the command line in the path of your working directory run
    npm install
7- run javascript program
    node inicio.js
8- Make any change to the Music library to see if in the bucket root the music.index file appears.
9- You can delete or put any mp3 file or directory to see the change in the music.index file

----------------------

    
