// ESM 版本：main() 挪进 setTimeout（宏任务上下文）—— 关键对比点
function main() {
  console.log('A')                                   // start
  setTimeout(() => console.log('B'))                 // timeout
  Promise.resolve().then(() => console.log('C'))     // promise
  process.nextTick(() => console.log('D'))           // nextTick
  async function a() {
    console.log('E')                                 // a-body
    await new Promise((r) => setTimeout(r, 0))       // pending
    console.log('F')                                 // a-after
  }
  a()
  console.log('G')                                   // end
}
setTimeout(main, 0)
