const crypto=require('crypto'); // https://cnodejs.org/topic/504061d7fef591855112bab5
const Uuid=require('uuid');
//const Http=require('http');
const Bluebird=require('bluebird'); // http://bluebirdjs.com/
const RequestPromise=require('request-promise-native'); // request-promise/-native。https://www.npmjs.com/package/request-promise. 还看到一个方法：Bluebird.promisifyAll(require("request"));
const JsonWebToken = require('jsonwebtoken');
const NodeMailer=require('nodemailer'); // 或者 const smtpTransporter=require('nodemailer').createTransport({host:'', port:25, auth:{user:'',pass:''}})
var smtpTransporter;

module.exports={
   // 从数据库来：取出的JSON字符串，转换成对象。
   // 从前端来：经过Node过滤后，value=req.param(...) 要么是string要么是对象/数组。如果前端预先 stringify 了，就全是 string。
  json2obj: function (value, from){
    from = ['mysql', 'http'].indexOf(from)>=0 ? from : 'http'; 
//    if (value==='NaN' || value==='Infinity') { // 如果前端做了stringify，那么不可能收到这两者（NaN/Infinity会变成"null"，parse后成 null；'NaN/Infinity'会变成'"NaN/Infinity"'）。如果前端没有stringify，那么前端的 NaN/Infinity 将变成 'NaN'/'Infinity'，在此手动过滤成 null；也有微弱的可能性，用户输入了'NaN/Infinity'！保留哪种都可以。
//      value=null;
//    }else 
    if (typeof value==='string'){  // 警惕，JSON.parse('0.01')===0.01,  JSON.parse('1111111111111111111')===1111111111111111200, JSON.parse('1111111111111111111111')===1.1111111111111111e+21, 产生了溢出！为保证前后一致，强烈要求在前端进行 JSON.stringify(value)再传过来。
try {
      var tmp = JSON.parse(value);
      if (from==='http') {
        value=tmp;
      }else if (from==='mysql') { // 从mysql里来，只有json/text/varchar/enum/time/null类型会是 string，parse后可能是 object/语法错/boolean/null/number/string。
        if (typeof tmp==='object' && tmp!==null) {  // 注意不要把数据库里的'null'字符串转换成null。JSON.parse('null')===null, 而且 typeof null==='object'
          value=tmp;
        }else if (typeof tmp==='boolean') { // JSON.parse('true/false') 要不要转换回boolean？因为在 set2sql 里把 boolean 存为了字符串。这样也带来一个问题：如果用户偏偏在text字段里存了'true/false'，那么读出后变成了boolean!
          value=tmp;
        }
      }
}catch (exception){} // 放在 if 语句末尾，为了直接跳到最后的 return 语句。不然就要执行 catch (exception){ return value; };
    }else if (typeof value==='object' && value && !(value instanceof Date)){ // mysql 会把 date/datetime/timestamp 类型字段直接返回 Date 类型对象，不必转换。
      for (let k in value) {
        value[k]=this.json2obj(value[k], from); // 注意 递归时 带上 from !
      }
    }
    return this.iso2Date(value);
  }
  ,
  iso2Date: function(value){ // recursively turn all elements of ISO date string to Date objects.
    if (typeof value==='string') {
      if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\dZ$/.test(value)){
        value = new Date(value);
      }
    }else if (typeof value==='object' && value && !(value instanceof Date)) {
      for (var k in value){
        value[k]=this.iso2Date(value[k]);
      }
    }
    return value;
  }
  ,
  isEmpty: function(value){
  	switch (typeof value){
  	  case 'number': if (value===0 || value!==value) return true; return false;
  	  case 'object': 
	  	  for (var attr in value){
	  	  	return false;
	  	  }
/*	  	  if (JSON.stringify(value)==='{}'){
	  	  	return true;
	  	  }
	  	  if (Object.keys(value).length===0){ // Object.keys(null) 会出错。
	  	  	return true;
	  	  } */
	  	  return true;
	  case 'string': if (value==='') return true; return false;
	  case 'undefined': return true;
	  case 'boolean': return value;
  	}
  	return true;
  }
  ,
  sendMail: async function(option){ // 或者如果smtp参数已经确定，就可以直接定义 sendMail: Bluebird.promisify(Smtp.sendMail).bind(Smtp)
    smtpTransporter=smtpTransporter||NodeMailer.createTransport(tic.Secret.SMTP);
    return await Bluebird.promisify(smtpTransporter.sendMail).call(smtpTransporter, option);
  }
  ,
  sendSms: async function(phone, msg){
/* 短信接口错误代码：
http://www.dxton.com/help_detail/2.html
100 发送成功 （表示已和我们接口连通）
101 验证失败（账号、密码可能错误）
102 手机号码格式不正确
103 会员级别不够
104 内容未审核 （试用或小批量应用，只能用系统后台公共模板格式，标点符号都要一致！）
105 内容过多或无合适匹配通道
106 账户余额不足
107 Ip受限
108 手机号码发送太频繁（一天5个），请换号或隔天再发
109 帐号被锁定
110 手机号发送频率持续过高，黑名单屏蔽数日
120 系统升级
*/
//    if (tic.Tool.typeofUid(phone)==='phone'){
      var matches=phone.match(/\d+/g);
      var smsNumber, smsUrl; 
      if (matches[0]==='86'){
        smsUrl = tic.Secret.SMS.urlChina;
        smsNumber=matches[1];
      }else{
        smsUrl = tic.Secret.SMS.urlWorld;
        smsNumber=matches[0]+matches[1];
      }
//      return Bluebird.promisify(Http.get)(smsUrl+'&mobile='+smsNumber+"&content="+encodeURIComponent(msg));
      return RequestPromise.get(smsUrl+'&mobile='+smsNumber+"&content="+encodeURIComponent(msg));
//    }
  }
  ,
  formatDate:function(date, format){ // date应当是合法的日期字符串 或合法的日期对象。否则，默认为是new Date()。
    if (typeof date==='string'){
      var date=new Date(date);
    }else if (typeof date==='object' && date instanceof Date){
      var date=date;
    }else{
      var date=new Date();
    }
    if (date.toJSON()===null){
      var date=new Date();
    }
    if (format && typeof format==='string') {
      var o = {
        'm+': date.getMonth() + 1, //月份 
        'q+': Math.floor((date.getMonth() + 3) / 3), //季度 
        'd+': date.getDate(), //日 
        'H+': date.getHours(), //小时 
        'M+': date.getMinutes(), //分 
        'S+': date.getSeconds(), //秒 
        's': date.getMilliseconds() //毫秒 
      };
      if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
      for (var k in o){
        if (new RegExp('(' + k + ')').test(format)) format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
      }
      return format;
    }
    return date.toISOString().replace(/^([\d\-]+)T([\d:]+).*Z$/,'$1 $2');
  }
  ,
  typeofUid : function(uid) { // 越底层，越通用、基础、广泛。例如，逻辑层允许各种电话格式，但本应用中，只允许中国11位手机号。
    if (uid) {
      if (uid.match(/^[_\w\-\.]+@[\w\-]+(\.[\w\-]+)*\.[a-zA-Z]{2,4}$/))
        return 'email';
      else if (uid.match(/^\+\d{1,3}-\d{11}$/))
        return 'phone';
      else if (uid.match(/^\*\d{1,12}$/)) // 注意，在前端的sid包含开头的 * 符号，以和省略了国家码的手机号区分。送到后台前，要删除该 * 符号。
        return 'aiid';
      else if (uid.match(/^\d{11}$/))
      	return 'callNumber';
    }
    return false;
  }
  ,
  uuid: Uuid.v1
  ,
  pad: function (num, len) {
    var num=parseInt(num)||0;
    var l = new String(num).length; 
    while(l < len) {
        num = "0" + num;
        l++;
    }
    return num;
  }
  ,
  hash:function(source, hashType){
    var hashType=hashType||'md5'; // could be md5, sha1, sha256, sha512, ripemd160. Default to md5.
    if (source && (typeof source==='string' || typeof source==='number'))
      return crypto.createHash(hashType).update(source).digest('hex');
    else
      return null;    
  }
  ,
  hash4Server:function(source) {
    if (source && (typeof source==='string' || typeof source==='number'))
      return crypto.createHash('md5').update(source+tic.Secret.HASH_SALT).digest('hex');
    else
      return null;
  }
  ,
  rsaSign: function(string2Sign, prikey, signType){
//    $yjPriKey = openssl_get_privatekey(self::$yjPriKey);
    signType=signType||'RSA-SHA1'; // could be RSA-SHA256, RSA-SHA1 or more
    let signer=crypto.createSign(signType);
    return encodeURIComponent(signer.update(string2Sign).sign(prikey, 'base64'));
  }
  ,
  rsaVerify: function(string2Verify, sign, pubkey, signType){
    signType=signType||'RSA-SHA1'; // could be RSA-SHA256, RSA-SHA1 or more
    let verifier=crypto.createVerify(signType);
    return verifier.update(string2Verify).verify(pubkey, sign, 'base64');
  }
  ,
  encrypt: function(data, algorithm, pwd){
    var cipher=crypto.createCipher(algorithm, pwd);
    var encrypted='';
    encrypted += cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  ,
  decrypt: function(data, algorithm, pwd){
    var decipher=crypto.createDecipher(algorithm, pwd);
    var decrypted='';
    decrypted += decipher.update(data, 'utf8', 'hex');
    decrypted += decipher.final('hex');
    return decrypted;
  }
  ,
  /**
   * 把数组所有元素，按照“参数=参数值”的模式用“&”字符拼接成字符串
   * @param $para 需要拼接的数组
   * return 拼接完成以后的字符串
   */
  getString2Sign: function (paramSet, converter, delimiter) {
    if (paramSet && typeof paramSet==='object') {
      var string2Sign = "";
      var converter = converter || '';
      var delimiter = delimiter || '';
      for (var key of Object.keys(paramSet).sort()) {
        var value=paramSet[key];
        if (value && typeof value==='object'){ // 万一 bis_content 等对象直接送了进来。
          value=JSON.stringify(value);
        }
        if ((typeof value==='string' && value!=='') || typeof value==='number') {
          if (converter==='urlencode') value=encodeURIComponent(value);
          string2Sign += (key + '=' + delimiter + value + delimiter + '&');  // 根据产品、版本、请求或响应的不同，有的需要key="vlaue"，有的只要key=value。
        }
      }
      string2Sign=string2Sign.replace(/&$/, ''); // 删除末尾的 &
  //    if (get_magic_quotes_gpc()) { $string2Sign = stripslashes($string2Sign); } 
  //    string2Sign=string2Sign.replace(/\\/g, ''); // 去除转义符 \ (似乎其实不去除，也完全不会影响，因为编程语言内部就会处理掉\)
  //    string2Sign=string2Sign.replace(/\//g, '\\/'); // 为了verify：把正斜杠进行转义 /  参见 https://openclub.alipay.com/read.php?tid=559&fid=2
      return string2Sign;
    }
    return '';
  }
  ,
  createToken: function(content) {
    if (content){ // 注意，jwt.sign(null|'') 会出错。但 sign(0)可以的。
      return JsonWebToken.sign(content, tic.Secret.TOKEN_KEY);
    }
    return null;
  }
  ,
  verifyToken: function(token) {
    if (token && typeof token==='string') {
try{  token=JsonWebToken.verify(token, tic.Secret.TOKEN_KEY);  }catch(exp){}
      if (Date.now() - Date.parse(token.whenStamp) > 2*60*60*1000) { // 每过2小时，核对一遍密码

      }
      if (typeof token==='object')
        return token;
    }
    return null;
  }
  ,
  isArray : function(obj) { // https://segmentfault.com/a/1190000006150186#articleHeader1
//    return obj instanceof Array; // 在不同iframe下不能正确识别Array。
//    return (typeof obj==='object' && obj.constructor.name==='Array'); // 或者 obj.constructor==Array。但是constructor属性是可以修改的，因此不靠谱。
//    return Object.prototype.toString.call(obj) === '[object Array]'; // 但Object.prototype.toString 也可以被修改。
//    return Array.isArray(obj); // 最靠谱，但isArray是es5的方法 所以某些情况下 为了兼容老的浏览器 并不会使用isArray的方法 会使用toString
    if (!Array.isArray) {
      Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
      };
    }
    return Array.isArray(obj);
  }
  ,
  getJsType: function(o){ // 返回：一个字符串，表示标量类型 undefined,boolean,number,string 以及对象类型 Null, Object, Array, String, Boolean, Number, Function
    var t = typeof(o)
    return ((t==="object" || t==="function") // function是特殊的，typeof 结果是function, 但 Object.prototype.toString.call 结果是 [object Function]。我选用大写形式。
      ? Object.prototype.toString.call(o).slice(8,-1) // 可以是 Null, Object, Function, Boolean, String, Number, Array
      : t) // 可以是 undefined, boolean, number, string
  }
  ,
  deepExtend: function(dest,source){
      for(var p in source){
        if(this.getJsType(source[p])=="Array"||this.getJsType(source[p])=="Object"){
          dest[p]=this.getJsType(source[p])=="Array"?[]:{};
          arguments.callee(dest[p],source[p]);
        }else{
          dest[p]=source[p];
        }
      }
  }
}
