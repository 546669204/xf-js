# xf-js 讯飞SDK 

适用于 浏览器 的讯飞SDK js  
采用最新的流式接口 websocket 

包含 
1. 语音听写 
2. 语音合成

## 安装
```
npm i xf-js
```

## 使用

```javascript
import * as xfjs from "xf-js";

//使用语音听写

var iat = new xfjs.iat({
  appId:"",//传入AppId
  authUrl:"",//AuthUrl 认证url  自己拼接
})


//绑定 onaudioprocess

使用createScriptProcessor创建出来的
var p = ctx.createScriptProcessor();
p.onaudioprocess = (e)=>{
  iat.onaudioprocess(e);
};

iat.start();//启动听写 
iat.stop((str)=>{
  //结果回调 
  // str 内容为转义 结果
});//停止


//如果时文件内存想要转义
var reader = new FileReader();
reader.onload = async (event)=>{
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var audioBuffer = await audioCtx.decodeAudioData(event.target.result);
  var ff = audioBuffer.getChannelData(0);
  iat.sendData(ff)
  iat.start();
  var b = new Date();
  iat.hook.onSendData = ()=>{
    b = new Date();
  }
  iat.hook.onSetResult = (e)=>{
    //实时结果返回
  }
  //监听转义结束
  var a = setInterval(() => {
    if((new Date().getTime() - b.getTime()) >1000){
      clearInterval(a);
      notify.close();
      iat.stop((e)=>{
        iat.hook.onSendData = null;
        iat.hook.onSetResult = null;
      });
    }
  }, 100);
}
reader.readAsArrayBuffer(file); //传入file对象



//使用语音合成
xfjs.tts({
  appId:"",//传入AppId
  authUrl:"",//AuthUrl 认证url  自己拼接
  text:"语音合成内容"
}).then(blob=>{
  new Audio(URL.createObjectURL(blob)).play();
})
```