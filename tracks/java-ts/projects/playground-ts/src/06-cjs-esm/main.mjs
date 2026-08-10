// ESM 版本：包进 main() 再调用（关键对比点）
function main() {
  console.log('A')                                 // start
  setTimeout(() => console.log('B'))               // timeout
  Promise.resolve().then(() => console.log('C'))   // promise
  process.nextTick(() => console.log('D'))         // nextTick
  async function a() {
    console.log('E')                               // a-body
    await new Promise((r) => setTimeout(r, 0))     // pending
    console.log('F')                               // a-after
  }
  a()
  console.log('G')                                 // end
}
main()
