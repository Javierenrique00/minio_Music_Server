# "music.index" File description #

MMEClient Android program needs to use the index file named "music.index". This file is a NDJSON file, so each line is a JSON object, each one separated with a linefeed character "\n".

The first line is special, the others only need information about each music file.

This is an example of a "music.index" file.

    {"version":1,"registers":4,"id":1}
    {"id":1988,"path":"music/Vangelis - The Best Of Vangelis/01. Spiral.flac","filesize":44770824,"extension":"flac"}
    {"id":1989,"path":"music/Vangelis - The Best Of Vangelis/02. Pulstar.flac","filesize":40217849,"extension":"flac"}
    {"id":1990,"path":"music/Vangelis - The Best Of Vangelis/03. Freefall.flac","filesize":13497668,"extension":"flac"}
    {"id":1991,"path":"music/Vangelis - The Best Of Vangelis/04. Sword Of Orion.flac","filesize":12570543,"extension":"flac"}

** First line ** -> only 3 fields needed
- version: 1 is the version that use MMEClient, in the future could be other number.
- registers: Number of music registers that the file has.
- id: Is a consecutive identificator of the index file. The idea is if the 'music.index' file has a change de id needed to change +1, so if the number is 2 MMEClient knows that the file change and is needed to reload the index.

** others lines ** ->only 4 filds needed, but is possible to put more fields from the metadata.
- id: MMEClient is not using this field now (optional), but you can use to know the secuence of the songs. The idea is a unique number that cannot be repeated.
- path: This is the identificator of the song and have to be unique. It has all of the route path of the song with its filename and extension.
- filesize: Is the number of bytes of the song. MMEClient use it to know the size of the song and to sum up all of the songs of a directories. If you use any number like 1 is valid, but if you put a number with a fake filesize the download advance indicator can show false information. The file download does not depend of this parameter in a direct way.
- extension: To display the icon of the file, in the future could be use to show movies with another extension or text or other icon type. Now all music extensions are a valid and have to be in accordance of the file in the index row.


### Other metadata (optional) ###

This is an example of the metadata of a music file with the most important fields used.

    {"id":13,
    "path":"music/80´s Rock/100 HITS - THE BEST - EIGHTIES ALBUM - CD1/14.Howard Jones - What Is Love.mp3",
    "filesize":8827769,
    "extension":"mp3",
    "title":"What Is Love?",
    "artist":"Howard Jones",
    "album":"100 Hits - The Best - Eighties",
    "year":2017,
    "track_no":14,
    "track_of":null,
    "disk_no":null,
    "disk_of":null,
    "duration":219.58530612244897,
    "lossless":false,
    "bitrate":320000,
    "sampleRate":44100,
    "numberOfChannels":2,
    "dataformat":"mp3"}

The most important field is **title:*** because if there is not title, MMEClient uses the last part of the path. In the last example the program it would use **"14.Howard Jones - What Is Love.mp3"** but the real title is only **"What Is Love?"**
These other fields are auto explained and no further explanation would not be needed.

