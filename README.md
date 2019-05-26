# minio_Music_Server
Minio music Server is a nodejs program to control a music library with metadata in a Minio storage with automatic index creation.

Is not a server in the strict sense, because the server is Minio, or the cloud storage that host the music.

The idea is that you have your Music Library copied to a Minio server (just a bunch of .mp3, flac, ogg, wav, etc.), files in any folder structure), then the Minio Music Server program indexed all metadata from your music library when it detects a change in the library. The index is in a NDJSON format.

The program works with Minio as a server and Amazon S3 storage in a direct way, but you can configure Minio Azure Gateway and Minio GCS (google cloud storage) to serve the music files. The difference is that in Minio it detects the changes in the music Library. With S3 and Minio Gateways you run the program each time the library changes to reindex the music library.

In the directories you can find the old version (proceduralVersion) of the program. The program was re engineered to be reactive using only data flows with the help of Kefir.js library.

Because I was not acustom to think in a reactive functional form I want to tell that it was hard to find wich is the way to program in this paradigm, and I found that is not easy but the final code result is less messy to understand

![Diagram](./doc/images/img1_diagram.jpg "Diagram")


I made a Android program called MMEClient, to read the index and download music from your Minio server. (Android program is in developer stage, free version available)

![Icon](./doc/images/opc2_128.jpg "Icon")

Check in Android Google Play.

https://play.google.com/store/apps/details?id=com.mundocreativo.javier.mmeclient


Thanks to:

Music-Metadata javascript:  https://github.com/borewit/music-metadata#readme

Minio Javascript Client api: https://docs.min.io/docs/javascript-client-api-reference.html

Minio Server configuration: https://docs.min.io/docs/minio-quickstart-guide.html


----------------------
### Server installation:

1. Install a working Minio instance. ( https://min.io/ ) S3 compatible storage.
2. Copy your music library to a bucket in the Minio Instance. (To access music from the Minio server to the android program you have to make the bucket public)
3. In any server, or PC you can install Node (Nodejs) 6 version or newer. (now I have node 10 version)

Check version

  **node --version**

4. Copy the node server program - minio_Music_server by cloning repository or copy javascript files from the github repository (*.js , *.json) to your working directory (any directory for the javascript program)
5. Configure access to minio in the file inicio.js .  change in accordance to your configuration.

#### inicio.js

Select S3 or Minio with:

    const minio = true  //--- true for Minio, false fo Amazon S3 or a Minio gateway.
    const SCAN_METADATA = true  //--- false for only read the basic data from directory listing, no metadata but is very fast because doesn't need to read all files for extracting metadata
                                //--- true for read all file and extract metadata information


//--- Configuring Globals USE for Minio

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

----------------

    //--- Configuring Globals USE for S3  Comment in case you have Minio
    var bucket = "mipublico"                     //--- name of the bucket
    var pathMusic = "music/"                     //--- path to the music library that you want to index
    var indexFileName = "music.index"            //--- leave a music.index (default)
    var minioClient = new Minio.Client({
        endPoint: 's3.amazonaws.com',            //--- IP of Amazon
        accessKey: 'XXXXXXXXXXX',       //---  Amazon server Access key
        secretKey: 'XXXXXXXXXXXXXXXXXXXXX'   //---  Amazon Secret Key
    });


----------------    
6. From the command line in the path of your working directory run

    **npm install**

7. run javascript program

    **node inicio.js**

8. Make any change to the Music library to see if the music.index file appears in the bucket.
9. You can delete or put any mp3 file or directory to see the change in the music.index file (this file shows the updates after 30 seconds of inactivity in the minio server)
----------------------

To see how to setup a freenas [here](doc/freenas.md)

To see my functional reactive programing toughts [here](doc/reactive.md)




