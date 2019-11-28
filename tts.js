import Crypto from "cryptojs";
console.log(Crypto)
var addWavHeader = function (samples, sampleRateTmp, sampleBits, channelCount) {
  var dataLength = samples.byteLength;
  var buffer = new ArrayBuffer(44 + dataLength);
  var view = new DataView(buffer);

  function writeString(view, offset, string) {
    for (var i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  var offset = 0;
  /* 资源交换文件标识符 */
  writeString(view, offset, 'RIFF');
  offset += 4;
  /* 下个地址开始到文件尾总字节数,即文件大小-8 */
  view.setUint32(offset, /*32*/ 36 + dataLength, true);
  offset += 4;
  /* WAV文件标志 */
  writeString(view, offset, 'WAVE');
  offset += 4;
  /* 波形格式标志 */
  writeString(view, offset, 'fmt ');
  offset += 4;
  /* 过滤字节,一般为 0x10 = 16 */
  view.setUint32(offset, 16, true);
  offset += 4;
  /* 格式类别 (PCM形式采样数据) */
  view.setUint16(offset, 1, true);
  offset += 2;
  /* 通道数 */
  view.setUint16(offset, channelCount, true);
  offset += 2;
  /* 采样率,每秒样本数,表示每个通道的播放速度 */
  view.setUint32(offset, sampleRateTmp, true);
  offset += 4;
  /* 波形数据传输率 (每秒平均字节数) 通道数×每秒数据位数×每样本数据位/8 */
  view.setUint32(offset, sampleRateTmp * channelCount * (sampleBits / 8), true);
  offset += 4;
  /* 快数据调整数 采样一次占用字节数 通道数×每样本的数据位数/8 */
  view.setUint16(offset, channelCount * (sampleBits / 8), true);
  offset += 2;
  /* 每样本数据位数 */
  view.setUint16(offset, sampleBits, true);
  offset += 2;
  /* 数据标识符 */
  writeString(view, offset, 'data');
  offset += 4;
  /* 采样数据总数,即数据总大小-44 */
  view.setUint32(offset, dataLength, true);
  offset += 4;
  for (var i = 0; i < dataLength; i++, offset++) {
    view.setUint8(offset, samples[i])
  }
  return view.buffer;
}

function concatenate(resultConstructor, ...arrays) {
  let totalLength = 0;
  for (let arr of arrays) {
    totalLength += arr.length;
  }
  let result = new resultConstructor(totalLength);
  let offset = 0;
  for (let arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export default function ({
  appId,
  authUrl,
  text,
  business = {
    "vcn": "xiaoyan",
    "aue": "raw",
    "speed": 50,
    "auf": "audio/L16;rate=16000",
    "tte": "UTF8"
  },
} = {}) {
  return new Promise((resolve, reject) => {
    let socket = new WebSocket(authUrl);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        "common": {
          "app_id": appId
        },
        "business": business,
        "data": {
          "status": 2,
          "text": CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text))
        }
      }))
    })
    socket.addEventListener("error", resolve)
    var b = [];
    socket.addEventListener("message", (res) => {
      var j = JSON.parse(res.data)
      if (j.code == 0) {
        b.push(Uint8Array.from(atob(j.data.audio), c => c.charCodeAt(0)))
        if (j.data.status == 2) {
          socket.close();
          var cc = addWavHeader(concatenate(Uint8Array, ...b), 16000, 16, 1);
          resolve(new Blob([cc], {
            mime: "audio/wav"
          }))
        }
      }
    })
  })

}