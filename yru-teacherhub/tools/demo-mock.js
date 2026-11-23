// ---- In-browser mock of Apps Script services ----
function MSheet(n){this.n=n;this.d=[];}
MSheet.prototype={getRange:function(r,c,nr,nc){var s=this;var o={getValues:function(){var out=[];for(var i=0;i<nr;i++){var row=s.d[r-1+i]||[];var x=[];for(var j=0;j<nc;j++)x.push(row[c-1+j]===undefined?'':row[c-1+j]);out.push(x)}return out},setValues:function(v){v.forEach(function(row,i){s.d[r-1+i]=s.d[r-1+i]||[];row.forEach(function(x,j){s.d[r-1+i][c-1+j]=x})});return o},setValue:function(x){s.d[r-1]=s.d[r-1]||[];s.d[r-1][c-1]=x;return o}};['setFontWeight','setBackground','setFontColor','setWrap','setFontFamily','setVerticalAlignment'].forEach(function(k){o[k]=function(){return o}});o.clearContent=function(){for(var i=0;i<nr;i++)s.d[r-1+i]=[];return o};return o},
setFrozenRows:function(){},setFrozenColumns:function(){},setColumnWidth:function(){},setName:function(n){this.n=n},getLastColumn:function(){return (this.d[0]||[]).length},getLastRow:function(){return this.d.filter(function(r){return r&&r.join('')!==''}).length},appendRow:function(r){this.d.push(r.slice())},
getDataRange:function(){var s=this;return{getValues:function(){var w=Math.max.apply(null,s.d.map(function(r){return r.length}));return s.d.map(function(r){var x=r.slice();while(x.length<w)x.push('');return x.map(function(v){return v===undefined?'':v})})}}},deleteRow:function(i){this.d.splice(i-1,1)}};
var BOOK={sheets:{},getSheetByName:function(n){return this.sheets[n]||null},insertSheet:function(n){return this.sheets[n]=new MSheet(n)},getSheets:function(){return Object.keys(this.sheets).map(function(k){return BOOK.sheets[k]})},deleteSheet:function(s){delete this.sheets[s.n]},getId:function(){return 'BOOK'}};
var PROPS={};
var SpreadsheetApp={getActiveSpreadsheet:function(){return BOOK},openById:function(){return BOOK},create:function(){var b={sheets:{},getSheets:function(){return [this.s0]},insertSheet:function(n){return new MSheet(n)},getId:function(){return 'TMP'}};b.s0=new MSheet('a');return b},flush:function(){},getUi:function(){}};
var PropertiesService={getScriptProperties:function(){return{getProperty:function(k){return PROPS[k]||null},setProperty:function(k,v){PROPS[k]=v}}}};
var LockService={getScriptLock:function(){return{waitLock:function(){},releaseLock:function(){}}}};
var FID=0;function MFile(name){this.id='F'+(++FID);this.name=name}MFile.prototype={getId:function(){return this.id},getUrl:function(){return 'https://drive.google.com/file/d/'+this.id+'/view'},getName:function(){return this.name},setSharing:function(){},setTrashed:function(){},getBlob:function(){return MBlob('x')}};
function MFolder(){}MFolder.prototype={getId:function(){return 'FOLD'},getFoldersByName:function(){return{hasNext:function(){return false}}},createFolder:function(){return new MFolder()},createFile:function(b){return new MFile(b.getName?b.getName():'f')}};
var DriveApp={getFolderById:function(){return new MFolder()},createFolder:function(){return new MFolder()},getFileById:function(){return new MFile('x')},Access:{},Permission:{}};
function MBlob(data,type,name){return{_d:data,getName:function(){return name},setName:function(n){name=n;return this},getAs:function(){return this},getBytes:function(){return [1,2,3]},getContentType:function(){return type},getDataAsString:function(){return typeof data==='string'?data:new TextDecoder().decode(new Uint8Array(data))}}}
function u8(s){return Array.from(new TextEncoder().encode(s))}
function fakeHash(s){var h1=0x811c9dc5,h2=0x12345;for(var i=0;i<s.length;i++){h1^=s.charCodeAt(i);h1=Math.imul(h1,16777619)>>>0;h2=(h2*31+s.charCodeAt(i))>>>0}var out=[];for(var k=0;k<32;k++)out.push(((k%2?h1:h2)>>>(k%24))&255);return out}
var Utilities={formatDate:function(d,tz,f){var p=function(n){return ('0'+n).slice(-2)};if(f==='yyyy-MM-dd')return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());return d.toISOString().slice(0,16).replace('T',' ')},
getUuid:function(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(){return (Math.random()*16|0).toString(16)})},
Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'s'},
computeHmacSha256Signature:function(v,k){return fakeHash(k+'::'+v)},computeDigest:function(a,v){return fakeHash(v)},
base64EncodeWebSafe:function(x){var bytes=typeof x==='string'?u8(x):x;var s=String.fromCharCode.apply(null,bytes.map(function(b){return b&255}));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_')},
base64DecodeWebSafe:function(s){var b=atob(s.replace(/-/g,'+').replace(/_/g,'/'));return Array.from(b).map(function(c){return c.charCodeAt(0)})},
base64Decode:function(s){return Array.from(atob(s)).map(function(c){return c.charCodeAt(0)})},
newBlob:function(d,t,n){return MBlob(d,t,n)},zip:function(b,n){return MBlob('z','zip',n)}};
var Session={getActiveUser:function(){return{getEmail:function(){return ''}}},getEffectiveUser:function(){return{getEmail:function(){return 'owner@yru.ac.th'}}},getScriptTimeZone:function(){return 'Asia/Bangkok'}};
var ScriptApp={getService:function(){return{getUrl:function(){return 'https://script.google.com/macros/s/DEMO/exec'}}},getOAuthToken:function(){return 't'}};
var UrlFetchApp={fetch:function(){return{getResponseCode:function(){return 200},getContentText:function(){return '{"id":"X"}'},getBlob:function(){return MBlob('x')}}}};
var HtmlService={};
// bridge
var google={script:{run:(function(){function mk(ok,fl){return new Proxy({},{get:function(_,k){if(k==='withSuccessHandler')return function(f){return mk(f,fl)};if(k==='withFailureHandler')return function(f){return mk(ok,f)};
 return function(){var a=JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)));setTimeout(function(){try{dirty_();var r=window[k].apply(null,a);ok(r===undefined?null:JSON.parse(JSON.stringify(r)))}catch(e){console.log('SERVER ERR',k,e.message);fl&&fl(e)}},5)}}})}return mk(function(){},null)})()}};

