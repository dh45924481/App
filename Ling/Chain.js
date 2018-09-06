var Ling = require('./Ling')

/******************** Public of object ********************/

function Chain(prop) {
  this._class=this.constructor.name
  this.setProp(prop)
}
const CLASS=module.exports=Chain
CLASS.__proto__=Ling
const PROTO=CLASS.prototype={ // 原型对象
  constructor:CLASS,
  __proto__:Ling.prototype
}

/******************** Shared by objects ********************/

/********************** Private of class *******************/

const my={
  genesis:{}
  ,
  lastBlock:null
  ,
  keypair:null // 启动时，从配置文件里读出节点主人的secword，计算出公私钥
}

/*********************** Public of class *******************/
CLASS.api={} // 面向前端应用的API

CLASS.actionPool=[]

CLASS._init=async function(){
  my.keypair=tic.Crypto.secword2keypair("skill loyal dove price spirit illegal bulk rose tattoo congress few amount")
  await this.createGenesis()
  this.gogogo()
}


CLASS.createGenesis=async function(){
  let genesis=new tic.Block({
    timestamp:tic.Const.genesisEpoche,
    message:'Some big things start out small'
  })
  await genesis.packMe([], null, my.keypair)
  mylog('genesis is created and verified: '+genesis.verifySig(my.keypair.pubkey))
//  mylog('genesis='); mylog(genesis)
  my.lastBlock=genesis


  let genesisDb=await tic.Block.getOne({Block:{hash:genesis.hash, height:genesis.height}})
//  mylog('genesisDb='); mylog(genesisDb);
  if (genesisDb && genesisDb.verifySig(my.keypair.pubkey) && ( genesisDb.creatorSignature === genesis.creatorSignature )) {
    mylog('genesis already in db. 开始验证数据库中的区块')
    await this.verifyChain()
  }else{
    await genesis.addMe()
    mylog('genesis is saved to db')

    mylog("********************")
    mylog(my.lastBlock.height)
    let action=new tic.ActTransfer({
      amount:tic.Block.getInitialAmount(), 
      toAddress:'A8QCwz5Vs77UGX9YqBg9kJ6AZmsXQBC8vj'
    })
    action.packMe(my.keypair)
    tic.Action.api.prepare({Action:action}) // 模拟前端调用 /Action/prepare 来提交事务。
    mylog("********************")

  }
}


CLASS.verifyChain=async function(){
  let limit=10
  let top=(await tic.Block.getCount()).count+tic.Const.genesisHeight-1
  mylog('共有'+top+'个人工区块在数据库')
  let blockList=[]
  while (my.lastBlock.height<top){
    blockList=await tic.Block.getAll({Block:{height:'>'+my.lastBlock.height}, config:{limit:limit, order:'height ASC'}})
    if (blockList){
      mylog('这一轮取出了'+blockList.length+'个区块')
      for (let block of blockList){
//        mylog('block of height '+ block.height +' is fetched')
        if (block.verifySig() && block.lastBlockHash===my.lastBlock.hash){
          mylog('block '+block.height+' is verified')
          my.lastBlock=block
        }else{
          mylog('block '+block.height+' 验证失败！')
          top=my.lastBlock.height
          break
        }
      }
    }else{
      break
    }
  }
}

CLASS.gogogo=async function(){
  let mining=setInterval(async function(){
    let newBlock=new tic.Block()
    newBlock.message='矿工留言在第'+(my.lastBlock.height+1)+'区块'
    await newBlock.packMe(Chain.actionPool, my.lastBlock, my.keypair)
//    mylog(newBlock)
//    mylog('block of height '+newBlock.height+' is generated.')
    await newBlock.addMe()
    my.lastBlock=newBlock
    mylog('block '+newBlock.height+' is added to database.')

    mylog('balance=')
    mylog(await tic.Account.getBalance({Account:{address:'A8QCwz5Vs77UGX9YqBg9kJ6AZmsXQBC8vj'}}) / Math.pow(10, tic.Const.PRECISION ) )

    // 测试：模拟前端发来转账请求
    if (newBlock.height===1 || newBlock.height===12){
      let action=new tic.ActTransfer({
        amount:188, 
        toAddress:'A8QCwz5Vs77UGX9YqBg9kJ6AZmsXQBC8vj'
      })
      action.packMe(my.keypair)
      tic.Action.api.prepare({Action:action}) // 模拟前端调用 /Action/prepare 来提交事务。
    }
  }, 10*1000)
}

CLASS.poolAction=function(action){ // 接收action，放入actionPool
  Chain.actionPool.push(action)
}

CLASS.getLastBlock = function(){
  return my.lastBlock;
}

