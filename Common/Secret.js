module.exports={
  mysql:{
    host:'localhost',
    port:3306,
    database:'yuanjin_sodata',
    user:'yuanjin',
    password:'9XeUrzduFcjAK4xc',
    charset: 'UTF8MB4_GENERAL_CI'
/*
  charset：连接字符集（默认：'UTF8_GENERAL_CI'，注意字符集的字母都要大写）
  localAddress：此IP用于TCP连接（可选）
  socketPath：连接到unix域路径，当使用 host 和 port 时会被忽略
　　timezone：时区（默认：'local'）
　　connectTimeout：连接超时（默认：不限制；单位：毫秒）
　　stringifyObjects：是否序列化对象（默认：'false' ；与安全相关https://github.com/felixge/node-mysql/issues/501）
　　typeCast：是否将列值转化为本地JavaScript类型值 （默认：true）
　　queryFormat：自定义query语句格式化方法 https://github.com/felixge/node-mysql#custom-format
　　supportBigNumbers：数据库支持bigint或decimal类型列时，需要设此option为true （默认：false）
　　bigNumberStrings：supportBigNumbers和bigNumberStrings启用 强制bigint或decimal列以JavaScript字符串类型返回（默认：false）
　　dateStrings：强制timestamp,datetime,data类型以字符串类型返回，而不是JavaScript Date类型（默认：false）
　　debug：开启调试（默认：false）
　　multipleStatements：是否许一个query中有多个MySQL语句 （默认：false）
　　flags：用于修改连接标志，更多详情：https://github.com/felixge/node-mysql#connection-flags
　　ssl：使用ssl参数（与crypto.createCredenitals参数格式一至）或一个包含ssl配置文件名称的字符串，目前只捆绑Amazon RDS的配置文件
　　其它：可以使用URL形式的加接字符串，不多介绍了，不太喜欢那种格式，觉得可读性差，也易出错，想了解的可以去主页上看。
*/
  }
  ,
  sqlite:{
    dbfile:'Database/blockchain.sqlite'
  }
  ,
  SMTP:{
    host:'mail.faronear.org',
    port:25,
//    secure:true, // use tls
    auth:{
      user:'postmaster@localhost',
      pass:'masterpost'
    }
  }
  ,
  SMS:{
    urlChina:'http://sms.106jiekou.com/utf8/sms.aspx?account=90788944&password=mysjz77336',
    urlWorld:'http://sms.106jiekou.com/utf8/worldapi.aspx?account=90788944&password=mysjz77336'
  }
  ,
  TOKEN_KEY:'lukasasdy'
  ,
  HASH_SALT:'*sIn?u1a*ity!'
  ,
// 使用 ES6 的 Template 写法：
  yjPriKey : `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDV0tqz+Y1pzuwi6k+6se2cEEg6G1/19AZ6//LnWi40qQE+KXjX
0VY9afe1AfHOHoxBstcsB54gMnbPB4TW4x1WjYzTJOolsieobfiRAsXPl7SvkZAp
pfNIJoYnxOBLz874d+vpjBZtbwhrRQ3gxBEFkcKpH3joolSnYJ7omzFvBQIDAQAB
AoGABh+83cy27SHdB374e5te98pLl0ZzcCLmEJ3GAjRGAIIapAIiEORQ+P9Q9eEx
YLrlP3h0yzEIqVlop7NKbbEhhOyp7Ey+BS6X7LpX7QR1CekNdmbzKIjVL3dPDat4
RDYPRqUYrqfFGMs2oghjl9joCKAUk8xj2wpXF7bg1MxHIkECQQD4ZXtTVpEFnfnB
cRkutioNFyVoIdeEZCzqvr2FyEquOv32fxoKyt9HSLA7JyquEMV+ERI79cS2dG0J
ycu6HUI1AkEA3F5y3n1cIC4fSzIKQbWUne5995Krmkzq4oKtr+Us3f/m0J8r6hMm
dUuhh/mAJQUWdowZapVbinoQ4ZnUCIETkQJAPhwJ6T21B2WH5MGl3VM5UoqeFNqZ
bAYsYQoOk5wQaF5h0DfZyCcQC1/2iOPzPRD+gNY96/Y5GLIl7ZOiuEfGnQJAYd9k
3yIIL5aseWYxHfv6lKYetj0jD/XHgHCPmYaMhdCo/9Eh3OVCeGftxwlt+4Ml9eLF
Swwoyvjp1HjQrjI9sQJBAN+JnGo7SjBzRWCv+N9G+2I2QQoJeh25605v0pr7s7+f
JfnjRcUMUIvUtWwJc6hsZZDPHOFISJUUxcx9ridXmUY=
-----END RSA PRIVATE KEY-----`
  ,
  aliPubKey : `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCnxj/9qwVfgoUh/y2W89L6BkRA
FljhNhgPdyPuBV64bfQNN1PjbCzkIM6qRdKBoLPXmKKMiFYnkd6rAoprih3/PrQE
B/VsW8OoM8fxn67UDYuyBTqA23MML9q1+ilIZwBC2AQ2UBVOrFXfFl75p6/B5Ksi
NG9zpgmLCUYuLkxpLQIDAQAB
-----END PUBLIC KEY-----`
  ,
// 使用真正的换行符：
  aliOpenPubKey : "-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDI6d306Q8fIfCOaTXyiUeJHkr\nIvYISRcc73s3vF1ZT7XN8RNPwJxo8pWaJMmvyTn9N4HQ632qJBVHf8sxHi/fEsra\nprwCtzvzQETrNRwVxLO5jVmRGi60j8Ue1efIlzPXV9je9mkjzOmdssymZkh2QhUr\nCmZYI/FCEa3/cNMW0QIDAQAB\n-----END PUBLIC KEY-----"

}
