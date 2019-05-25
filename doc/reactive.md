## Reactive programing thoughts

I think that the best way to learn something is to take the risk and face some progressively difficult tasks and in the way solving the issues that we find. When I created the code for the server, I thought that the code was very messy because the program needs a lot of asynchronous calls like finding metadata from a song.

I began making the part of the code for detecting files changes in the server and used the Kefir.js library to watch and respond reindexing the Music files. Minio can detect only a event change in one file extension type. So I had to create one monitoring for each file extension. Then I have collected all of this events and use a Pool.plug for each monitored stream. Then I debounce this stream in a way that if there are no changes detected in the monitored files for certain amount of time the process of reindexing will begin. At first this look intuitive and I decided to change all of the program paradigm. This was only a small part.

### Taking the Risk

I was no satisfied with the messy code, so I decided to change the paradigm to functional reactive programing, this could not be a very difficult task. I was wrong.

The idea was to begin small, so I tried the easy and essencial parts using the code that I had. The first task was to create a new index.

Read the List from the minio server, I had a function that make this task, so the idea is to changed in the way that when I called it returns a Stream with the list. The returned stream is an array with the list of files. I had the first Stream Yea!!!

The code looks easy.



    function readDirectory(bucket,pathMusic){
    let finList$ = Kefir.stream(emitter =>{
        let dirList = [];
        ...
        ...
        //--- Minio get dirList
        ...
        ...
        stream.on('end', function(obj) {
        emitter.value(dirList);
        } )
    })
    return finList$
    }

I called with this easy code:

    finList$ = readDirectory(bucket,pathMusic);

and to see the answer I use:

    finList$.onValue( x=>{
        console.log("Answer:",x)
    })

So the idea is to create a Stream that returns the Listing of files.  Piece of cake !

I did the same to read the index file.

So to decide what to do if create a new empty Music.index file or compare the index I need to have the data of the two Streams.
I choose to use:

    result$ = Kefir.zip([firstStream$,secondStream$])

With Zip, it waits for the two streams to have results but in my case that the stream only have one time result, it helped me to wait for the two results at the same time. easy.


Comparing this code with the code that I had in the procedural paradigm was a huge change.

These two tasks (1) Reading the list and (2) Reading the directory in the procedural async paradigm  nature of the tasks was a bit messy. Because one could make launch first task, then launch second task and wait that the two tasks get finished with some control code, or in the other way making the first task and then in the end of this call, call the second task in a nested way. In the program I chosed this way, nested so I don't have to put any observers or special asyncronic logic. This was an error, because all fo the following code was nested.

Again in the reactive funcional programing, I found a tricky part, when I have all of the directory listing in one Stream that I choose to not stream as an array but as a many secuencial data and apply the function to find all of the metadata. Looks that the reactive programming was designet to face this kind of things.

But mmm.. nothing I tryed a lot of solutions, the problem is that finding metadata needs to read all the file until the end, and the time that takes can have a lot variations. The idea is no to congest the server with many concurrent tasks, only one at the time.

But I tryed for almost a week different solutions that take me to understand how reactive programing works. I was finding a solution that has circular dependency solution, but in FRP (functional reactive programing) is almost forbidden. The problem is if I have a input Stream with any frecuency and transform this Stream in another with different frecuency, I needed to know how much time will take this nested task take, and change the input frequency to not congest the server with simultaneous queries. The error was to think in procedural way. I need to change how to think.

The solution was easy to implement but take me too much time to find.

only with this small code:

        inputStream$.flatMapConcat( x => loadMetadata(...Some parameters(x)) )

This .flatMapConcat make exactly what I need.

At the end I see that my code was data driven in a funcional primitive way **(input)->(transform)->(output)**, but this transformation carry all of the data in the arrows, so the arrows get Thick, because the next transformation need this data to generate the result. Creating all of the classes or structures could be a little heavy for each step in the transformation path.

Conditional in the data flow was a bit messy because going in different paths are not conected in a easy visual way, there are conected in a logical way but usually is not secuencial.

Have a conventional program transformed to (FRP) could in general not to be a good idea, because complexity can grow exponentially

## Lessons learned:

Changing a whole paradigm in the way of thinking is not easy, it takes time and therefore if the project has limitations for time (as almost always) it is not advisable to change the reactive paradigm.

Many projects can successfully use highly asynchronous parts without having to rewrite the entire code.

The reactive code is difficult to debug, and it is up to testing and supposing in separate files the behaviors that one wants to use.

It is very important to understand the end of a stream that has a very important role and that helps to minimize the number of control data.

We need to understand exactly what we need because most of the tasks that make one thing very good are not good solutions that fits all.


