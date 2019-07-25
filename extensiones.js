audioExtensiones = function(){
    return ["mp3","aiff","ape","wma","wmv","asf","flac","mp2","mpc","mp4","m4a","m4v","ogg","oga","mogg","wav","wma","wv"]
}

videoExtensiones = function(){
    return ["avi","mpg","vob","mkv"]
}

encriptionExtensiones = function(){
    return ["encrypt"]
}

allExtensiones = function(){
    return (audioExtensiones().concat(videoExtensiones())).concat(encriptionExtensiones())
}

exports.audioExtensiones = function(){
    return audioExtensiones()
}

exports.videoExtensiones = function(){
    return videoExtensiones()
}

exports.encriptionExtensiones = function(){
    return encriptionExtensiones()
}

exports.allExtensiones = function(){
    return allExtensiones()
}