var Ling = require('./Ling')

/******************** Public members of object ********************/

function Block(prop) { // 构建类
  this._class=this.constructor.name
  this.setProp(prop)
}
const CLASS=module.exports=Block
CLASS.__proto__=Ling
CLASS._table=CLASS.name
const PROTO=CLASS.prototype={ // 原型对象
  constructor:CLASS,
  __proto__:Ling.prototype
}

/******************** Public members shared among objects ********************/

PROTO._model={ // 数据模型，用来初始化每个对象的数据
  hash:         { default:undefined, sqlite:'TEXT',     mysql:'VARCHAR(64) PRIMARY KEY' }, 
  version:      { default:0,         sqlite:'INTEGER',  mysql:'INT' }, 
  timestamp:    { default:undefined, sqlite:'INTEGER',  mysql:'INT' }, 
  height:       { default:undefined, sqlite:'INTEGER',  mysql:'BIGINT' }, 
  lastBlockHash:{ default:null,      sqlite:'TEXT UNIQUE',     mysql:'VARCHAR(64)' }, 
  numberAction: { default:0,         sqlite:'INTEGER',  mysql:'INT' }, 
  totalAmount:  { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' }, 
  totalFee:     { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' }, 
  reward:       { default:0,         sqlite:'NUMERIC',  mysql:'BIGINT' },
  payloadHash:  { default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' }, 
  creatorPubkey:{ default:undefined, sqlite:'TEXT',     mysql:'BINARY(32)' }, 
  creatorSignature: { default:undefined, sqlite:'TEXT',     mysql:'BINARY(64)' },
  message:      { default:'',        sqlite:'TEXT',     mysql:'VARCHAR(256)' },
  actionList:   { default:[],        sqlite:'TEXT' }, // 要不要在Block里记录每个事务？还是让每个事务自己记录所属Block？
  json:         { default:{},        sqlite:'TEXT' } // 开发者自定义字段，可以用json格式添加任意数据，而不破坏整体结构
}

PROTO.getReward= function (height) {
  height=height||this.height||1
  let reward=0
  if (height>0){
    for (let milestone of my.milestones){
      if (height>=milestone.start)
        reward=milestone.reward
      else
        break
    }
  }
  return reward
}
PROTO.getSupply= function (height) { // 计算当前流通总数：预发行数+挖出数
  height=height||this.height||1
  let supply = my.initialAmount // 创世块中预发行的数量
  if (height>0){
    for (let i=0; i< my.milestones.length; i++){
      if (height >= my.milestones[i+1].start){
        supply += my.milestones[i].reward * (my.milestones[i+1].start - my.milestones[i].start)
      }else{
        supply += my.milestones[i].reward * (height - my.milestones[i].start)
      }
    }
  }
  return supply
}

PROTO.sortActionList= function () {
  if (Array.isArray(this.actionList)) {
    this.actionList.sort(function compare(a, b) {
      return a.localeCompare(b) // localeCompare 相当于 > : B>b>A>a>1>0, 返回减法 - 的结果 >为1,=为0,小于为-1
    })
  }
  return this
}

PROTO.packMe = async function (actionPool, lastBlock, keypair) { // 后台节点挖矿者的公私钥
  this.height = lastBlock ? lastBlock.height + 1 : tic.Const.genesisHeight
  this.reward = this.getReward()
  this.totalFee = 0
  this.totalAmount = 0
  this.version = 0
  this.timestamp = lastBlock?new Date().getTime():tic.Const.genesisEpoche
  this.lastBlockHash = lastBlock?lastBlock.hash:null
  this.creatorPubkey = keypair.pubkey

  let actionList=[]
  while (action=actionPool.shift()) { // 遍历所有交易，累计哈希和总金额、总手续费等。
    if (await action.execute()){ // save changes of this action to other tables such as account
      actionList.push(action) // 后面还需要修改每个action的blockHash，存入数据库，所以这里要先保存在一个数组里
      this.actionList.push(action.hash)

      this.totalFee += (action.fee||0)
    }else{ // 也许事务无法执行（balance不够等等）
      continue
    }
  }
  this.payloadHash = tic.Crypto.getMerkleRoot(this.actionList)
  this.numberAction = this.actionList.length

  this.signMe(keypair.seckey)
//  this.normalize()

  this.hashMe()

  for (var action of actionList) {
    action.blockHash=this.hash
    action.addMe()
  }

  mylog('block '+this.height+' is created with '+this.numberAction+' actions',false)


  return this
}

PROTO.hashMe = function(){
  this.hash=tic.Crypto.hash(this.getJson(['hash', 'height']),'hex')
  return this
}
PROTO.verifyHash=function(){
  return this.hash===tic.Crypto.hash(this.getJson(['hash', 'height']),'hex')
}
PROTO.signMe = function(seckey){ // 似乎不需要，因为签字是前端用户做的
  let json=this.getJson(['hash','height','creatorSignature'])
  this.creatorSignature=tic.Crypto.sign(json, seckey)
  return this
}
PROTO.verifySig = function () { // 验证其他节点发来的block
  let json=this.getJson(['hash','height','creatorSignature'])
  let res=tic.Crypto.verify(json, this.creatorSignature, this.creatorPubkey)
  // 要不要继续验证actionList？
  return res
}

PROTO.normalize=function(){
  for (let action of this.actionList) {
//    action.normalize();
  }
  return this
}

/********************** Private members of class *******************/

const my={
  initialAmount: 10000000000000000 // 应该命名为 baseAmount，因为这不是全部的，还会挖出新的来
  ,
  milestones: [
    { reward:350000000, start:1}, // Initial Reward
    { reward:300000000, start:3000000}, // Milestone 1
    { reward:200000000, start:6000000}, // Milestone 2
    { reward:100000000, start:9000000}, // Milestone 3
    { reward:50000000,  start:12000000}  // Milestone 4
  ]
  ,
  maxPayloadLength: 1*1024*1024 // 1M个字节/字符
}

/*********************** Public members of class *******************/

CLASS.api={} // 面向前端应用的API

CLASS.getInitialAmount = function(){
  return my.initialAmount
}
