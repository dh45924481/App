const sqlite=require('sqlite-pool');
// https://github.com/coopernurse/node-pool const genericPool=require('generic-pool');
// http://www.runoob.com/sqlite/sqlite-data-types.html
// https://github.com/mapbox/node-sqlite3
// https://github.com/kriasoft/node-sqlite sqlite3+promise
// https://github.com/rneilson/node-sqlite-pool

var db;

module.exports={
  _init:async function(dbfile){
    dbfile=dbfile||tic.Secret.sqlite.dbfile||"Database/database.sqlite";
    db=await new sqlite(dbfile, {cached:true, min:2, max:10}); // 先等db创建好，不然调用其方法可能 UnhandledPromiseRejectionWarning: Error: SQLITE_BUSY: database is locked
    return this
/* 或者使用 generic-pool
const pool=genericPool.createPool({
    create:function(){
      return new sqlite.open(dbfile, {cached:true});
    },
    destroy:function(conn){
      conn.close();
    }
  },
  {max:10, min:2}
);
const getConn=pool.acquire();
*/
  }
  ,
  createTable: async function(option){
    let sql='create table if not exists '+escapeId(option._table)+' (';
    for (let key in option.set){
      sql = sql+key+' '+option.set[key]+' , '
    }
    sql = sql.replace(/,\s*$/,')')
    return await db.use(async function(conn){
//      mylog(sql)
      let report=await conn.run(sql);
//      mylog(report)
      return report
    }).catch(console.log)
  }
  ,
  getNumber: async function(option){
    if (option && option._table && option.where && option.field && option.func && ['sum','avg','max','min','count'].indexOf(option.func)>=0){
      let sql='select '+option.func+'('+(option.field!=='*'?escapeId(option.field):'*')+') as '+option.func+' from '+escapeId(option._table)+' where '+where2sql(option.where)
      return await db.use(async (conn)=>{
        let row=await conn.get(sql)
        if (row && row.hasOwnProperty(option.func)) return row
        else return null
      }).catch(console.log)
    }
    return null
  }
  ,
  getData: async function(option) {
    if (option && option._table && option.where) {
      let sql='select * from '+escapeId(option._table)+' where '+where2sql(option.where)+config2sql(option.config);
      return await db.use(async (conn)=>{
          let rowList=await conn.all(sql);
          if (rowList) return tic.Tool.json2obj(rowList, 'mysql');
          return null;
      }).catch(console.log);
    }
    return null
  }
  ,
  setData: async function(option) {
    if (option && option._table && option.where && option.set) {
      var self=this;
      var sql='update '+escapeId(option._table)+' set '+set2sql(option.set)+' where '+where2sql(option.where); //+config2sql(option.config); // sqlite的update语句默认不支持Limit/order
      return await db.use(async function(conn){ 
        let report=await conn.run(sql);
        if (report && report.changes>0) {
          for (var key in option.set){
            if (key!=='whenInserted' && key!=='whenUpdated') { // 万一Ling传来的 option.set 包含 whenInserted/Updated，在 set2sql 里会被过滤掉，但在set对象里仍然存在，要过滤掉。
              option.where[key]=option.set[key]; // 把新设的值合并到原来的条件里。
            }
          }
//          option.config=option.config||{};
//          option.config.limit=report.changes;
          var result=await self.getData(option); // todo: 万一update后，where能找到更多条目了，怎么办？
          return result;
        }
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  addData: async function(option) {
    if (option && option._table && option.set) {
      var self=this;
      var sql='insert into '+escapeId(option._table)+set2sql(option.set, true);
      return await db.use(async function(conn) {
          let report=await conn.run(sql)
          if (report && report.stmt.lastID>0) {
//            mylog('lastID='+report.stmt.lastID)
            var result = await self.getData({_table:option._table,where:{rowid:report.stmt.lastID},config:{limit:1}}); // 返回数据对象
            return result;
          }
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  hideData: async function(option) { // 或者叫做 delete, remove, erase, cut, drop
    if (option && option._table && option.where) {
      var self=this;
      var sql='update '+escapeId(option._table)+' set `mark`='+escape(tic.Const.MARK_DELETED)+' where '+where2sql(option.where); //+config2sql(option.config);
      return await db.use(async function(conn){ 
        let report=await conn.run(sql);
        if (report) { // report.affectedRows/changedRows
          option.where.mark=tic.Const.MARK_DELETED;
          option.config=option.config||{};
//          option.config.limit=report.changes;
          return await self.getData({_table:option._table, where:option.where, config:option.config}); // todo: 万一update后，where能找到更多条目了，怎么办？
        }
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  dropData: async function(option) {
    if (option && option._table && option.where) {
      var self=this;
      var sql='delete from '+escapeId(option._table)+' where '+where2sql(option.set, true); // 默认不支持limit/order: http://www.sqlite.org/lang_delete.html
      return await db.use(async function(conn) {
          let report=await conn.run(sql)
          if (report && report.stmt.lastID>0) {
            return report;
          }
        return null;
      }).catch(console.log);
    }
    return null;
  }
  ,
  callProc: async function(option) {
// http://localhost:6327/Person_getAllCall?person[aiid]=100000000019&param=[100000000019]&_func=getAllFriends
    function param2sql(param){
      var sqlParam='';
      if (param && Array.isArray(param)) {
        for (var v of param){
          sqlParam+= escape(v) + ' , ';
        }
      }
      return sqlParam.replace(/,\s*$/,'');
    }
    if (option && typeof option._proc==='string') {
      var sql='call '+escapeId(option._proc)+' ( ' + param2sql(option.param) + ' ) '; 
      return await db.use(async function(conn){
        let resultList=conn.run(sql);
        if (resultList && Array.isArray(resultList[0])) { // 存储过程返回一个数组 [ rows, report ]
          tic.Tool.json2obj(resultList[0], 'mysql');
          return resultList[0];
        }
        return null;
      }).catch(console.log);
    }
    return null;
  }

}

function escapeId(key){
  return '`'+key.replace(/\s/,'')+'`'
}
function escape(value){
  if (typeof value==='undefined' || value===null){
    return 'null'
  }
  return "'"+value+"'" // value可能是含有"的json字符串，所以不能在外面用""。当然更好的是 replace(/"/,'')
}

function value2sql(value){ // value 有可能是 Date 类型！Number(一个Date) 会返回毫秒数，造成比较错误。
  if (typeof value==='string' && Number(value)===Number(value)) return Number(value); // 注意在json字段内部作比较时，数字和字符不能通用，5 和 '5' 无法相等。太奇怪了，等mysql改进。
  else return escape(value); // undefined 和 null 会被 escape 成 'NULL' 字符串。而 'null' 字符串会被escape成'\'null\'' 字符串。https://github.com/mysqljs/mysql#escaping-query-values
}

function where2sql(where){ // todo: 注意，mysql 无法比较整个json字段！不能 where json='{}'！！！
  var sqlWhere='1';
  var matches, value;
  where=where||{};
  if (where.rowid){ // 这是特别为了防止，add/setData 内的再次 getData 带来的 where 里有 json 字段。
    sqlWhere = escapeId('rowid') + ' = ' + escape(where.rowid);
    if (where.mark===('!='+tic.Const.MARK_DELETED)) {
      sqlWhere += ' AND (mark is null or mark != '+escape(tic.Const.MARK_DELETED)+') ';
    }
  }else{
    for (var key in where){
  //    if (typeof key==='string' && key.match(/^_/)) continue; // 避免express3的query/body发来奇怪的 {..., __proto__:{}}，并且过滤掉_class, _data等（假如前端没有过滤掉这些）。

      value=where[key];
      if (value===undefined || value!==value || value===Infinity) continue; // 把undefined/NaN/Infinity值认为是不需要处理的。undefined会被escape成'NULL'，NaN/Infinity会导致mysql出错。
      else if (typeof value==='object' && value!==null && !(value instanceof Date)) value=JSON.stringify(value); // 不要修改 Date，让 escape 去转化成 'YYYY-mm-dd HH:ii:ss'，否则 MySQL 无法识别 'YYYY-mm-ddTHH:ii:ss.mmmZ' 格式。
      else if (typeof value==='boolean') value=value.toString();
    
      key=escapeId(key);
      sqlWhere += ' AND ';
      if (value===null){ // 问题：前端直接ajax发送对象，null会被变成空字符串''（即xxx:null 被翻译成 xxx=&)，所以不能送来null。解决方案1：在前端发送前JSON.stringify。 2. 在这里允许 value==='=null'
        sqlWhere += key+' is null ';
      }else if (value==='!=null'){
        sqlWhere += key+' is not null ';
      }else if (typeof value==='string' && (matches=value.match(/^!=\s*(.*)$/))){ // 注意，\w* 不能接受 - . 这种数字里的符号。
        sqlWhere += ' ('+key+' is null or '+key+' != '+value2sql(matches[1])+') ';
      }else if (typeof value==='string' && (matches=value.match(/^([<>]=?)\s*(.*)\s*([<>]=?)\s*(.*)$/))){ // 要放在单一的[<>]前面，否则match不到。
        sqlWhere += key+matches[1]+value2sql(matches[2])+' AND '+key+matches[3]+value2sql(matches[4]);
      }else if (typeof value==='string' && (matches=value.match(/^([<>]=?)\s*(.*)$/))){
        sqlWhere +=  key+matches[1]+value2sql(matches[2]); // 注意不要对比较符号去做escape! 否则sql字符串里变成 ...'>'... 就错了。
      }else if (typeof value==='string' && (matches=value.match(/^~\s*(.*)$/))){
        sqlWhere += key+' REGEXP '+value2sql(matches[1]);
      }else if (typeof value==='string' && (matches=value.match(/^(\$[.\[].+)([<>=])(.*)$/))){
        sqlWhere += key+'->"'+matches[1]+'"'+matches[2]+value2sql(matches[3]);
      }else{
        sqlWhere += key+' = '+value2sql(value);
      }
    }
  }
  return sqlWhere;
}

function set2sql(set, insert){ // 把js对象预备存入数据库
  var sqlSet='', sqlKeySet='(', sqlValueSet='(';
  var value;
  set=set||{};
  for (var key in set){
//    if (typeof key==='string' && key.match(/^_/)) continue; // 避免express3的query/body发来奇怪的 {..., __proto__:{}}，并且过滤掉_class, _data等（假如前端没有过滤掉这些）。
    if (key==='whenUpdated' || key==='whenInserted') continue;

    value=set[key];
    if (value===undefined || value!==value || value===Infinity) continue; // 把undefined/NaN/Infinity值认为是不需要处理的。undefined会被escape成'NULL'，NaN/Infinity会导致mysql出错。
    else if (typeof value==='object' && value!==null && !(value instanceof Date)) value=JSON.stringify(value);
    else if (typeof value==='boolean') value=value.toString(); // escape(true/false)==='true/false'，而true/false在mysql里被认作1/0，完全不同，所以禁止这样转换，而是强制转换成字符串。
//    else if (value==='=null') value=null;

      sqlKeySet = sqlKeySet + escapeId(key) + ' , ';
      sqlValueSet = sqlValueSet + escape(value) + ' , ';
      sqlSet += escapeId(key)+' = '+escape(value) + ' , '; 
  }
  return insert?
    (sqlKeySet.replace(/,\s*$/,')') + ' values ' + sqlValueSet.replace(/,\s*$/,')')) // insert into table
    :sqlSet.replace(/,\s*$/,'');  // update table
}

function config2sql(config){
  var sqlConfig='';
  if (config && typeof config==='object'){
    if (config.group){
      sqlConfig += ' group by '+config.group;
    }
    if (config.order){
      switch (config.order){
        case 'random': sqlConfig += ' order by rand()'; break;
        default: sqlConfig += ' order by '+config.order;
      }
    }
    if (1<=parseInt(config.limit) && parseInt(config.limit)<=tic.Const.LIMIT_MAX){
      sqlConfig += ' limit '+parseInt(config.limit);
    }else if (tic.Const.LIMIT_MAX<parseInt(config.limit)){
      sqlConfig = sqlConfig + ' limit '+tic.Const.LIMIT_MAX;
    }else{
      sqlConfig += ' limit '+tic.Const.LIMIT_DEFAULT;
    }
  }else{
    sqlConfig += ' limit '+tic.Const.LIMIT_DEFAULT;
  }
  return sqlConfig;
}


// try {
//   sql="insert into `Test`(`hash` , `num`, `date` ) values ('sdfasdfa', 100, '100' )";
//   db.use(async function(conn){
//     return await conn.run(sql)
//   }).then(function(res){mylog(res)})
// }catch(err){
//   console.log(err);
// }
// try {
//   sql="select * from `Test` where 1";
//   db.use(async function(conn){
//     return await conn.all(sql)
//   }).then(function(res){mylog(res)})
// }catch(err){
//   console.log(err);
// }
