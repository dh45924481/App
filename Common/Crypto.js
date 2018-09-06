var crypto=require('crypto')
var nacl = require('tweetnacl')
//const base58check=require('../Common/base58check.js')
var bs58check = require('bs58check')
var Mnemonic = require('bitcore-mnemonic')

module.exports = {
  hash:function(data, outputFormat){ // outputFormat: 留空=》默认输出hex格式；或者手动指定 hex,buf,latin1,ascii,utf8
    return crypto.createHash('sha256').update(data).digest(outputFormat==='buf'?undefined:(outputFormat||'hex'))
  }
  ,
  verify: function (data, signature, pubkey) {
    if (typeof signature==='string' && typeof pubkey==='string'){
      var bufHash=crypto.createHash('sha256').update(data).digest()
      var bufSignature = Buffer.from(signature, "hex")
      var bufPubkey = Buffer.from(pubkey, "hex")
      var res = nacl.sign.detached.verify(bufHash, bufSignature, bufPubkey)
      return res
    }
    return null
  }
  ,
  sign: function(data, seckey) { // data can be string or buffer, results are the same
    var hash = crypto.createHash('sha256').update(data).digest();
    var signature = nacl.sign.detached(hash, Buffer.from(seckey, "hex"));
    return Buffer.from(signature).toString("hex");
  }
  ,
  secword2keypair: function(secword){
    var hashBuf=crypto.createHash('sha256').update(secword).digest();
    var keypair = nacl.sign.keyPair.fromSeed(hashBuf);
    return {
      hash: hashBuf.toString('hex'),
      pubkey: Buffer.from(keypair.publicKey).toString("hex"), // 测试过 不能直接keypair.publicKey.toString('hex')，不是buffer类型
      seckey: Buffer.from(keypair.secretKey).toString("hex")
    }
  }
  ,
  hash2keypair:function(hash){ // 后台不应该知道secword，应该从hash求出公私钥
    var hashBuf = (typeof hash==='string')?Buffer.from(hash,'hex'):hash;
    var keypair = nacl.sign.keyPair.fromSeed(hash);
    return {
      hash: hashBuf.toString('hex'),
      pubkey: Buffer.from(keypair.publicKey).toString("hex"), // 测试过 不能直接keypair.publicKey.toString('hex')，不是buffer类型
      seckey: Buffer.from(keypair.secretKey).toString("hex")
    }
  }
  ,
  isAddress: function (address) { 
    if (typeof address !== 'string') {
      return false
    }
    if (!bs58check.decode(address.slice(1))) {
      return false
    }
    if (['A'].indexOf(address[0]) == -1) {
      return false
    }
    return true
  }
  ,
  pubkey2address:function (pubkey) { // 类似比特币的公钥到地址的算法。
    if (typeof pubkey === 'string') {
      pubkey = Buffer.from(pubkey, 'hex')
    }
    var h1 = crypto.createHash('sha256').update(pubkey).digest()
    var h2 = crypto.createHash('ripemd160').update(h1).digest()
    return 'A' + bs58check.encode(h2) //tic 怎么是把前缀生搬硬套上去的的？应该是先加前缀，再做b58check。哦这种唯一的前缀可以硬加，大家都认可就行，不影响传输。
  /*tic 准备修改地址格式：
    var prefix='55'; // 前缀使得b58check后变成某个特定字符开头。'55' =》 b开头，代表bug，不应该出现这样的wif地址。
    switch (Config.netVersion){
      case 'mainnet': prefix='6E'; break; // =》 m 开头wif地址
      case 'testnet': prefix='7F'; break; // =》 t 开头wif地址
      default: prefix='5A'; break; // =》 d 开头wif地址
    }
    var wifAdd=base58check.encode(Buffer.from(prefix+h2.hexSlice(),'hex'));
    return wifAdd;
  */
  }
  ,
  secword2address:function(secword){
    var kp=this.secword2keypair(secword)
    var address=this.pubkey2address(kp.pubkey)
    return address
  }
  ,
  randomString:function (length) {
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%^&*@";
    var text = "";
    for (var i = 0; i < max; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text
  }
  ,
  randomSecword:function(lang){
    lang=lang.toUpperCase()
    if (!Mnemonic.Words.hasOwnProperty(lang))
      lang=Mnemonic.Words.ENGLISH
    return new Mnemonic(Mnemonic.Words[lang]).toString()
  }
  ,
  getMerkleRoot:function(hashList){
    // merkle算法略有难度，暂时用最简单的hash代替
    if(tic.Tool.isArray(hashList)){
      var hasher=crypto.createHash('sha256')
      for (var hash of hashList){
        hasher.update(hash)
      }
      return hasher.digest('hex')
    }
    return null
  }
}
