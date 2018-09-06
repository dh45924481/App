module.exports={

  DBTYPE:'sqlite',
  
  LIMIT_DEFAULT:12,
  LIMIT_MAX:1000,
  SESSION_LIFETIME:60*60*24*7, // 一星期
  PRECISION:8, 
   //Date.UTC(2018, 0, 08, 0, 18, 18, 18)  //1515370698018  
  genesisEpoche:new Date('2018-01-08T00:18:18.018Z').getTime() ,//1515341898018
  genesisHeight:0,

  MARK_DELETED:'MARK_DELETED',
  MARK_LINKED:'MARK_LINKED', // 建立了关系（care, know, join 等）
  MARK_RELEASED:'MARK_RELEASED', // 解除了关系（care, know, join 等）
  STAT_ON:1, // 'STAT_ON'
  STAT_OFF:0, // 'STAT_OFF'
  UPLOAD_LIMIT:1048576 // 单位: Byte。

}
