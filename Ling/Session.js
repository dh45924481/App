var Ling = require('./Ling');

function Session(prop){ 
  this._class=this.constructor.name
  this.setProp(prop)
}
const CLASS=module.exports=Session
CLASS.__proto__=Ling
CLASS._table=CLASS.name
const PROTO=CLASS.prototype={ // 原型对象
  constructor:CLASS,
  __proto__:Ling.prototype
}

Session.prototype._model={
  aiid: { default:undefined, js:null, sqlite:'INTEGER PRIMARY KEY',  mysql:'BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY' },
  sessid: { default:null, js:null, sqlite:'TEXT',  mysql:'VARCHAR(50) DEFAULT NULL' },
  whenStart: { default:null, js:null, sqlite:'INTEGER',  mysql:'datetime DEFAULT NULL' },
  whenEnd: { default:null, js:null, sqlite:'INTEGER',  mysql:'datetime DEFAULT NULL' },
  client: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'request' },
  session: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'option' },
  server: { default:null, js:null, sqlite:'TEXT',  mysql:'json default NULL', info:'response' },
  starId: { default:null, js:null, sqlite:'TEXT',  mysql:'VARCHAR(100) DEFAULT NULL' },
  star: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL' },
  webInfo: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'必有的web information' },
  appInfo: { default:null, js:null, sqlite:'TEXT',  mysql:'json DEFAULT NULL', info:'可有的app information' },
  whenInserted: { default:undefined, js:null, sqlite:'INTEGER',  mysql:'timestamp NULL DEFAULT CURRENT_TIMESTAMP' },
  whenUpdated: { default:undefined, js:null, sqlite:'INTEGER',  mysql:'timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
  location: { default:null, js:null, sqlite:'TEXT',  mysql:'JSON DEFAULT NULL', info:'包含地理位置（经纬度，海拔，方向，等等）和社会地址{country:{},province:{},city:{},......}。' }
}

// 定义类的公开数据和方法（不能从对象里使用）。作为面向前端的api。
Session.isOnline=function(option){
  if (option && option._token) return option._token.onlineSid?true:false; // =0或null时，代表没有登录，是匿名用户。
  else return this.onlineSid?true:false; // 没有提供option,那么当前调用者就是option._token
}

Session.logTransaction=function (ask, option, result){
    delete option._req; // req 不能被 JSON.stringify，因为 TypeError: Converting circular structure to JSON
    new so.Session().addMe({session:{ // 不需要await
      whenStart:option._whenStart,
      whenEnd:new Date(),
//      sessid:ask.session.id,
      session:option, // ask.session,
      starId:option.starId,
      client:{
        ip: ask.ip || ask.headers['x-forwarded-for'] || ask.connection.remoteAddress,  // io.sockets.on 'connection', (socket) -> ip = socket.handshake.address.address 
        protocol:ask.protocol,
//        hostname:ask.hostname,
        host:ask.headers.host, // === ask.get('host')
//        url:ask.url,
        originalUrl:ask.originalUrl
      },
      server:result
    }});
//    mylog('》》'+JSON.stringify(result));
  }


Session.logMoveEvent=function(option){
  if (option.session.location) {
    move=new Event({model:'PERSON',action:'MOVE', info:option.session.location, starId:option.starId});
    move.addMe();
  }
}
