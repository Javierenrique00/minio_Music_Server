audioExtensiones = function(){
    return ["mp3","aiff","ape","wma","wmv","asf","flac","mp2","mpc","mp4","m4a","m4v","ogg","oga","mogg","wav","wma","wv"]
}

videoExtensiones = function(){
    return ["avi","mpg","vob"]
}

allExtensiones = function(){
    return audioExtensiones().concat(videoExtensiones())
    
}

exports.audioExtensiones = function(){
    return audioExtensiones()
}

exports.videoExtensiones = function(){
    return videoExtensiones()
}

exports.allExtensiones = function(){
    return allExtensiones()
}