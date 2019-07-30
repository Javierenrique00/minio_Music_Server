## Encryption in Minio Music Server

Because if you want to host your library in a public cloud that has good advantage like availability, low maintenance you sacrifice confidentiality, is a good option to encrypt all your library.

To encrypt your library is necesary to recreate the index file, so you need to delete this file first. Then Enable encryption in Minio Music server and run the program again.

To enable encryption you need to set these two fields, ENCRYPTED as true, and set a PASSWORD.

        const ENCRYPTED = true    //--- True for encrypted index database, False no encryption
        var PASSWORD = "xxx"      //----Choose a password

The encryption **needs to read all** the files to **write a new encrpypted version** of the multimedia files. So if the library is big it can take a lot of time ( Charges for download/uploads transfers may apply to the cloud provider) to do this task.

The encryption works in this way:

1- You provide a password that is hashed with SHA algorithm to encrypt in AES a internal key that is in charge to encrypt the index file and the library.

.... INCOMPLETE, WORK IN PROGRESS ..... this explanation will be explained in a better way later... 

