var Ling = require('./Ling')

/******************** Public of object ********************/

function Account(prop) { // 构建类
  this._class=this.constructor.name
  this.setProp(prop)
}
const CLASS=module.exports=Account
CLASS.__proto__=Ling
CLASS._table=CLASS.name
const PROTO=CLASS.prototype={ // 原型对象
  constructor:CLASS,
  __proto__:Ling.prototype
}

PROTO._model={
  user:           { default:undefined, sqlite:'TEXT',   mysql:'String' }, // 隶属于哪个真人用户
  name:           { default:undefined, sqlite:'TEXT',   mysql:'String(20)' },
  address:        { default:undefined, sqlite:'TEXT UNIQUE',   mysql:'String(50)' },
  pubkey:         { default:undefined, sqlite:'TEXT UNIQUE',   mysql:'Binary(32)' },
  secondpubkey:   { default:undefined, sqlite:'TEXT',   mysql:'Binary(32)' },
  secondSignature:{ default:undefined, sqlite:'TEXT',   mysql:'BigInt' },
  balance:        { default:0,         sqlite:'NUMERIC',   mysql:'BigInt' },
  multisignatures:{ default:undefined, sqlite:'TEXT',   mysql:'Text' },
  blockHash:        { default:undefined, sqlite:'TEXT UNIQUE',   mysql:'String(64)' },
  producedblocks: { default:undefined, sqlite:'INTEGER',mysql:'BigInt' },
  missedblocks:   { default:undefined, sqlite:'INTEGER',mysql:'BigInt' },
  fees:           { default:0,         sqlite:'NUMERIC',   mysql:'BigInt' },
  rewards:        { default:0,         sqlite:'NUMERIC',   mysql:'BigInt' },
  lockHeight:     { default:undefined, sqlite:'INTEGER',mysql:'BigInt' },
  json:           { default:{},        sqlite:'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

/******************** Shared by objects ********************/

PROTO.normalize=async function(){

}

/*********************** Public of class *******************/

CLASS.api={} // 面向前端应用的API

CLASS.api.getAccount=async function(option){ // 根据address 查看现有账户
  if (option && typeof option.Account==='object' && 
    tic.Crypto.isAddress(option.Account.address)){
      option.excludeSelf=true
    let account= await Account().getOne(option)
    if (account){
      return account
    }
  }
  return null
}
CLASS.api.addAccount=async function(option){ // 根据pubkey 创建新账户
  if (option && typeof option.Account==='object' &&
    option.Account.pubkey){
    let account=new Account({
      address: tic.Crypto.pubkey2address(option.Account.pubkey),
      pubkey: option.Account.pubkey
    })
    await account.addMe()
    return account
  }
  return null
}
CLASS.getBalance=CLASS.api.getBalance=async function(option){
  if (option && option.Account && option.Account.address){
    let received=await tic.Action.getSum({Action:{toAddress: option.Account.address}, field:'amount'})
    let sent=await tic.Action.getSum({Action:{senderAddress: option.Account.address}, field:'amount'})
    return received.sum - sent.sum
  }
  return null
}

/********************** Private of class *******************/

const my = {
}
