var workerJs = require("!!raw-loader!./worker");
var workerUrl = URL.createObjectURL(new Blob([workerJs.default],{mine:"text/javascript"}));
let recorderWorker = new Worker(workerUrl)
let buffer = []

recorderWorker.onmessage = function (e) {
  buffer = buffer.concat(e.data.buffer)
}

class IatClass {
  constructor({
    appId,
    authUrl,
    format = "audio/L16;rate=16000",
    business = {
      'language': "zh_cn",
      'domain': 'iat',
      'accent': "mandarin",
      'vad_eos': 2000,
      'dwa': 'wpgs'
    },
    hook = {}
  } = {}) {
    Object.assign(this, {
      appId,
      authUrl,
      format,
      business,
      hook
    });
    this.resultText = "";
  }
  start(){
    this.resultText = "";
    this.ws = new WebSocket(this.authUrl);
    this.ws.addEventListener("open", this.wsOpen.bind(this))
    this.ws.addEventListener("message", this.wsMessage.bind(this))
    this.ws.addEventListener("close", this.wsClose.bind(this))
    this.ws.addEventListener("error", this.wsError.bind(this))
  }
  async stop(cb){
    //延迟100ms 等待 结果 
    await new Promise(resolve => setTimeout(resolve, 100))
    this.ws.send(JSON.stringify({
      'data': {
        'status': 2,
        'format': this.format,
        'encoding': 'raw',
        'audio': ''
      }
    }))
    clearInterval(this.handlerInterval)
    this.cb = cb;
  }
  relese(){
    this.ws && this.ws.close();
    this.handlerInterval && clearInterval(this.handlerInterval);
  }
  wsOpen(){
    if (this.ws.readyState !== 1) {
      return
    }
    var audioData = buffer.splice(0, 1280)
    var params = {
      'common': {
        'app_id': this.appId
      },
      'business': this.business,
      'data': {
        'status': 0,
        'format': this.format,
        'encoding': 'raw',
        'audio': this.ArrayBufferToBase64(audioData)
      }
    }
    this.ws.send(JSON.stringify(params))
    this.handlerInterval = setInterval(() => {
      // websocket未连接
      if (this.ws.readyState !== 1) {
        clearInterval(this.handlerInterval)
        return
      }
      audioData = buffer.splice(0, 1280)
      if (audioData.length <= 0) return;
      // 中间帧
      this.ws.send(JSON.stringify({
        'data': {
          'status': 1,
          'format': this.format,
          'encoding': 'raw',
          'audio': this.ArrayBufferToBase64(audioData)
        }
      }))
      this.hook.onSendData && this.hook.onSendData();
    }, 40)
  }
  wsMessage(e){
    let jsonData = JSON.parse(e.data)
    if (jsonData.data && jsonData.data.result) {
      this.setResult(jsonData.data.result)
    }
    if (jsonData.data && jsonData.data.status == 2) {
      this.cb(this.resultText)
    }
  }
  wsClose(){

  }
  wsError(){

  }
  setResult(data) {
    var str = ''
    let ws = data.ws
    for (let i = 0; i < ws.length; i++) {
      str = str + ws[i].cw[0].w
    }
    // 开启wpgs会有此字段(前提：在控制台开通动态修正功能)
    // 取值为 "apd"时表示该片结果是追加到前面的最终结果；取值为"rpl" 时表示替换前面的部分结果，替换范围为rg字段
    if (data.pgs === 'apd') {
      this.resultText = this.resultText + str;
    } else {
      this.resultText = str;
    }
    this.hook.onSetResult && this.hook.onSetResult(this.resultText);
  }

  onaudioprocess(e){
    this.sendData(e.inputBuffer.getChannelData(0))
  }
  sendData(buffer) {
    recorderWorker.postMessage({
      command: 'transform',
      buffer: buffer
    })
  }
  ArrayBufferToBase64(buffer) {
    var binary = ''
    var bytes = new Uint8Array(buffer)
    var len = bytes.byteLength
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}


export default IatClass;