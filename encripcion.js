exports.encripta = function(data,ivParam,password){

    let iv = new Buffer(ivParam,'base64')
    let crypto = require('crypto')
    let myKey = crypto.createCipheriv('aes-128-cbc',password,iv)
    let  myStr = myKey.update(data,'utf8','base64')
    myStr += myKey.final('base64')
    return {data: myStr,iv:iv.toString('base64')}
}

exports.encriptaBinary = function(data,ivParam,password){
    let iv = new Buffer(ivParam,'base64')
    let crypto = require('crypto')
    let myKey = crypto.createCipheriv('aes-128-cbc',password,iv)
    let  myStr = myKey.update(data,'binary','binary')
    myStr += myKey.final('binary')
    return myStr
}

exports.encriptaHEX = function(data,ivParam,password){

    let iv = new Buffer(ivParam,'base64')
    let crypto = require('crypto')
    let myKey = crypto.createCipheriv('aes-128-cbc',password,iv)
    let  myStr = myKey.update(data,'utf8','hex')
    myStr += myKey.final('hex')
    return myStr.toString('hex')
}


exports.genIV = function(){
    let crypto = require('crypto')
    let iv = new Buffer(crypto.randomBytes(16))
    return iv.toString('base64')
}


exports.desEncripta = function(data,password,ivParam){

    let crypto = require('crypto')
    
    let iv = new Buffer(ivParam,'base64')
    let myKey = crypto.createDecipheriv('aes-128-cbc',password,iv)
    let decStr = myKey.update(data,'base64','utf8')
    decStr += myKey.final('utf-8')
    return decStr
}


//----debe chequear que la llave sea de 16 caracteres de longitud y devuelve el password
exports.checkPassword = function checkPassword(password){
    let longitud = password.length
    if(longitud==16) return password
    if(longitud>16) return password.substring(0,16)
    if(longitud<16) return password+" ".repeat(16-longitud)
}

