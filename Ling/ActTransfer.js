const Action = require('./Action')

/******************** Public of object ********************/

function ActTransfer(prop) {
  this._class=this.constructor.name
  this.setProp(prop)
  this.type=this._class
}
const CLASS=module.exports=ActTransfer
CLASS.__proto__= Action
// CLASS._table=CLASS.name // 注释掉，从而继承父类Action的数据库表格名
const PROTO=CLASS.prototype={ // 原型对象
  constructor:CLASS,
  __proto__:Action.prototype
}

PROTO.execute=async function(){
  let sender= await tic.Account.getOne({Account: { address: this.senderAddress }}) || await tic.Account.addOne({Account: { address: this.senderAddress }})
  let getter= await tic.Account.getOne({Account: { address: this.toAddress }}) || await tic.Account.addOne({Account: { address: this.toAddress }})
  let balance=await tic.Account.getBalance({Account:{address: this.senderAddress}})
  if (balance - this.amount - this.fee >= 0 || tic.Chain.getLastBlock().height == tic.Const.genesisHeight){
    await sender.setMe({Account:{ balance: sender.balance-this.amount }, cond:{ address:sender.address}})
    await getter.setMe({Account:{ balance: getter.balance+this.amount }, cond:{ address:getter.address}})
    return this
  }
  console.info('balance 不够！')
  return null
}

