'use strict';

async function start(){

  // 设置全局对象
  global.mylog=function(option,isOutPut=true){
    //  if (process.env.runas==='debug'){
      if(isOutPut){
        console.log(option)
      }
    //  }
  }
  global.tic={}
  tic.Const=require('./Common/Const')
  tic.Secret=require('./Common/Secret')
  tic.Tool=require('./Common/Tool')
  tic.Crypto=require('./Common/Crypto')
  tic.ActTransfer=require('./Ling/ActTransfer')

  mylog('Initializing database......')
  tic.Data=await require('./Data/')._init('Database/blockchain.sqlite')

  mylog('Creating tables......')
  tic.Ling=require('./Ling/Ling')
  tic.Action=await require('./Ling/Action')._init()
  tic.Account=await require('./Ling/Account')._init()
  tic.Block=await require('./Ling/Block')._init()
  tic.Session=await require('./Ling/Session')._init()
  
  mylog('Initializing chain............')
  tic.Chain=require('./Ling/Chain')
  tic.Chain._init()

  mylog("Starting Server......")

  const Express = require('express')
  //const Cors = require('cors')
  const Logger=require('morgan')
  const MethodOverride=require('method-override')
  //const Session = require('express-session') // https://github.com/expressjs/session
  //const Redis = require('connect-redis')(Session)
  const CookieParser=require('cookie-parser')
  const BodyParser=require('body-parser')
  const Path=require('path')
  const Favicon = require('serve-favicon')
  const ErrorHandler=require('errorhandler')

  const ticnode = Express()


  /*** 通用中间件 ***/

  ticnode.use(Logger('development'===ticnode.get('env')?'dev':'combined')) // , {stream:require('fs').createWriteStream(Path.join(__dirname+'/node_log', 'http.log'), {flags: 'a', defaultEncoding: 'utf8'})})) // format: combined, common, dev, short, tiny.  发现 defaultEncoding 并不起作用。
  ticnode.use(MethodOverride())
  //ticnode.use(Session({store: new Redis({host: "127.0.0.1", port: 6379}), resave:false, saveUninitialized:false, name: 'ticnode.sid', secret: tic.Secret.TOKEN_KEY, cookie: {  maxAge: tic.Const.SESSION_LIFETIME*1000 }})) // name: 'connect.sid'
  ticnode.use(CookieParser())
  ticnode.use(BodyParser.json()) // 用于过滤 POST 参数
  ticnode.use(BodyParser.urlencoded({ extended: true }))
  //ticnode.use(Cors())
  //ticnode.use(Express.static(__dirname+'/www')) // 可以指定到 node应用之外的目录上。windows里要把 \ 换成 /。
  //ticnode.use('webpath', Express.static('filepath'))
  //ticnode.use(Favicon(__dirname + '/www/favicon.ico'))
  ticnode.use('/wallet', Express.static('../ticweb/www/wallet', {index:'index.html'}))

  /*** 路由中间件 ***/

  ticnode.all('/:_who/:_act', function(ask, reply){ // '/api/:_version/:_starId/:_class/:_do'

    /* 把前端传来的json参数，重新解码成对象 */
    var option={}
    for (let key in ask.query){ // GET 方法传来的参数
      option[key]=tic.Tool.json2obj(ask.query[key])
    }
    for (let key in ask.body){ // POST 方法传来的参数
      option[key]=tic.Tool.json2obj(ask.body[key])
    }
    /////////// authentication ///////////////////
    option._token=tic.Tool.verifyToken(option._token)||{} // aiid, pwdClient, whenTokenCreated
    option._token.isOnline=tic.Session.isOnline
    option._whenStart=new Date()
    option._req=ask // File_upload, Provice_verifyPay 需要 _req

    async function normalize(result){ // 有的实例的normalize 需要当前用户信息，比如 Message 要根据当前用户判断 vote 。所以这个函数定义在这里，把含有当前用户信息的option给它
      if (result && result instanceof tic.Ling){
        if (typeof result.normalize==='function'){ // 是 Ling 元素
          await result.normalize(option) // 有的 normalize 需要 option，例如检查当前用户是否投票了某消息
          // 不进入下一层去递归normalize了。
        }
      }else if (result && typeof result==='object'){ // 是其他对象或数组
        for (var i in result){
          await normalize(result[i])
        }
      }else if (typeof result==='undefined'){ // reply.json(undefined 或 nothing) 会导致什么都不输出给前端，可能导致前端默默出错。因此这时返回null。
        result=null
      }
      return result
    }

    reply.setHeader('charset','utf-8')
    reply.setHeader('Access-Control-Allow-Origin','*')
    reply.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE')
    reply.setHeader('Access-Control-Allow-Headers','X-Requested-With,Content-Type')
  //  reply.setHeader("Content-Type",'json')  // 这一句用于 express 3。在 express 4里，已经 BodyParser.json()了，再加这句导致 TypeError: invalid media type。

    let _who=ask.params._who
    let _act=ask.params._act

    try{ // 把所有可能的exception都捕获起来，防止node死掉。
      if (tic[_who] && tic[_who].api.hasOwnProperty(_act) && typeof tic[_who].api[_act]==='function'){
        tic[_who].api[_act](option).then(async function(result){ // [ask.params._class][ask.params._do]. 注意，由于这里用了 then，所以每个接口函数必须都定义成 async
          tic.Session.logTransaction(ask, option, result)
          if (result && result.cmd==='NOT_JSON' && result.info){ // 如果被调用的方法没有返回值，json_encode会返回null（作为字符串），而alipay需要verifyPay仅仅输出字符串success/fail，这时不能再从这里输出null。所以让verifyPay返回一个信号字符串。
            reply.send(result.info)
          }else{
            reply.json(await normalize(result))  // 似乎 json(...) 相当于 send(JSON.stringify(...))。如果json(undefined或nothing)会什么也不输出给前端，可能导致前端默默出错；json(null/NaN/Infinity)会输出null给前端（因为JSON.stringify(NaN/Infinity)返回"null"）。
      //    reply.send(JSON.stringify(result)) // 注意，如果用 send，null/undefined 会什么也不输出给前端。数字会被解释成http状态码。NaN/Infinity会导致出错。所以，send(JSON.stringify(result))
          }
        }).catch(function(err) {
//          tic.Session.logTransaction(ask, option, {error:err})
          reply.json(null)
        })
      }else{
//        tic.Session.logTransaction(ask, option, {badapi:_who+'/'+_act})
        reply.json(null)
      }
    }catch(exception){
//      tic.Session.logTransaction(ask, option, {exception:exception})
      reply.json(null)
    }

  })

  ticnode.all('*', function(ask, reply){
    reply.json({badroute:ask.originalUrl}) // todo: null
  })

  // 错误处理中间件应当在路由加载之后才能加载
  if ('development'===ticnode.get('env')) {
    ticnode.use(ErrorHandler({
      dumpExceptions: true,
      showStack: true
    }))
  }

  /*** 启动 Web 服务 ***/

  //ticnode.set('env', 'production') // 改用操作系统的环境变量： set NODE_ENV=production
  ticnode.set('port', process.env.PORT || 6842)
  // 同时或选择启用 http 和 https。https端口设为 ticnode.get('port')+443=6770。如果同时启用，前端根据用户发起的http/https来各自连接，但这样子，两个socket.io之间不通，从https和http来访的用户之间，不能实时聊天。
  const portHttp=ticnode.get('port')
  const portHttps=ticnode.get('port')+443
  if ('development'===ticnode.get('env')) { // 如果在本地localhost做开发，就启用 http。注意，从https网页，不能调用http的socket.io。Chrome/Firefox都报错：Mixed Content: The page at 'https://localhost/yuncai/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://localhost:6327/socket.io/?EIO=3&transport=polling&t=LoRcACR'. This request has been blocked; the content must be served over HTTPS.
    const httpServer=require('http').createServer(ticnode)
  //  tic.Chat.init(httpServer)
    httpServer.listen(portHttp, function() {
      console.log('【%s】 ticnode_http listening on port %d in %s mode', new Date().toJSON(), portHttp, ticnode.settings.env)
    })
  }else { // 启用 https。从 http或https 网页访问 https的ticnode/socket 都可以，socket.io 内容也是一致的。
    const fs = require('fs')
    const httpsServer = require('https').createServer({
      key: fs.readFileSync('../SSL/private.key')
      ,
      cert: fs.readFileSync('../SSL/certificate.crt')
      ,
      ca: [ fs.readFileSync('../SSL/ca_bundle.crt') ] // https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
    }, ticnode)
  //  tic.Chat.init(httpsServer)
    httpsServer.listen(portHttps, function(err){
      console.log('【%s】 ticnode_https listening on port %d in %s mode', new Date().toJSON(), portHttps, ticnode.settings.env);
    })
  }
}

start()
