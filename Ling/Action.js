var Ling = require('./Ling')

/******************** Public of object ********************/

function Action(prop) {
  this._class=this.constructor.name
  this.setProp(prop)
}
const CLASS=module.exports=Action
CLASS.__proto__=Ling
CLASS._table=CLASS.name
const PROTO=CLASS.prototype={ // 原型对象
  constructor:CLASS,
  __proto__:Ling.prototype
}

/******************** Shared by objects ********************/

PROTO._model= {
  hash:           { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(64) PRIMARY KEY' }, // 不纳入签名和哈希
  version:        { default:0,         sqlite:'INTEGER' },
  blockHash:      { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(64)' }, // 不纳入签名和哈希。只为了方便查找
  type:           { default:undefined, sqlite:'TEXT',     mysql:'TINYINT' }, // 是否放在 assets里更好？这里该放action自己的version
  timestamp:      { default:undefined, sqlite:'INTEGER',  mysql:'INT' },
  senderPubkey:   { default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' },
  senderAddress:  { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(50)' },
  senderSignature:{ default:undefined, sqlite:'TEXT',     mysql:'BINARY(64)' }, // 不纳入签名，纳入哈希
  toAddress:      { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(50)' },
  amount:         { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' },
  fee:            { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' },
  signSignature:  { default:undefined, sqlite:'TEXT',     mysql:'BINARY(64)' }, // 不纳入签名，纳入哈希
  requesterPubkey:{ default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' },
  signatures:     { default:undefined, sqlite:'TEXT',     mysql:'TEXT' },
  option:         { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(4096)' },
  message:        { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(256)' },
  act:            { default:null,      sqlite:'TEXT' }, // 相当于 asch/lisk里的asset
  json:           { default:{},        sqlite:'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

PROTO.packMe = function(keypair){ // 似乎不需要，因为是前端用户创建事务，后台不创建
  this.senderPubkey=keypair.pubkey
  this.senderAddress=tic.Crypto.pubkey2address(keypair.pubkey)
  this.timestamp=new Date().getTime()
  
  this.signMe(keypair.seckey)
  this.hashMe()
  return this
}

PROTO.signMe = function(seckey){ // 似乎不需要，因为签字是前端用户做的
  let json=this.getJson(['hash','blockHash','senderSignature','signSignature','signatures']) // 是前端用户发起事务时签字，这时候还不知道进入哪个区块，所以不能计入blockHash
  this.senderSignature=tic.Crypto.sign(json, seckey)
  return this
}

PROTO.verifySig = function(){
  let json=this.getJson(['hash','blockHash','senderSignature','signSignature','signatures'])
  let res=tic.Crypto.verify(json, this.senderSignature, this.senderPubkey)
  return res
}

PROTO.verifyAddress = function(){
  return this.senderAddress===tic.Crypto.pubkey2address(this.senderPubkey)
}

PROTO.hashMe = function(){
  this.hash=tic.Crypto.hash(this.getJson(['hash', 'blockHash']),'hex') // block.hash 受到所包含的actionList影响，所以action不能受blockHash影响，否则循环了
  return this
}

PROTO.verifyHash = function(){
  return this.hash===tic.Crypto.hash(this.getJson(['hash', 'blockHash']),'hex')
}

PROTO.execute=function(){ // 将来会不会有这种action: 会影响到其他数据，所以不能简单的把自己存好就算数，而是要把其他相关数据都修改好。
  // save to account or other tables
  return this
}

PROTO.multisign = function (keypair) {
  var bytes = this.getJson(true, true);
  return tic.Crypto.sign(bytes, keypair.seckey).toString('hex');
}

PROTO.calculateFee = function(){
  return 1000
}

/*********************** Public of class *******************/
CLASS.api={}

CLASS._test=async function(){
  let action=new Action({
    senderPubkey:"f6dd47bd4f31fdfd0024df4f63d266b12f788c54b9cc11f8f068215e75be6037",
    senderAddress:"ANMd5o4pAAnv2vuF2u35Bt9KaSfPKSMXfb",
    fee:1000
  })
  await action.addMe()
  action.amount=139
  mylog('原始的事务：'+JSON.stringify(action))
  await action.signMe("57b3a55e4f3135a4a7086d74891b4b658f004ddba5ab11c928ab274b1b5835adf6dd47bd4f31fdfd0024df4f63d266b12f788c54b9cc11f8f068215e75be6037")
  await action.hashMe()
  mylog('签字并哈希后：'+JSON.stringify(action))
  await action.setMe()
  let res=action.verifySig()
  mylog('验证结果：'+res)
}

CLASS.api.prepare=async function(option){ // 前端发来action数据，进行初步检查（不检查是否可执行--这和事务类型、执行顺序有关，只检查格式是否有效--这是所有事务通用的规范）后放入缓冲池。
  if (option && option.Action && option.Action.type){
    let action=new tic[option.Action.type](option.Action) // 一次性把option.Action里送来的参数导入新建的action
    if (action.verifyAddress() && action.verifySig() && action.verifyHash()){
      tic.Chain.poolAction(action)
      return action
    }
  }
  return null  // 非法的交易数据
}

/********************** Private of class *******************/

const my = {
}
