/**
 * 练习 3：结构化类型 —— TS 与 Java 类型系统的根本分歧
 *
 * 运行：pnpm 03（类型检查用 pnpm check）
 *
 * Java 是「名义类型」（nominal）：类型相同看名字，名字不同就不兼容。
 * TS 是「结构化类型」（structural）：类型相同看形状，形状匹配就兼容。
 */

interface Point {
  x: number
  y: number
}

interface Vector {
  x: number
  y: number
}

const p: Point = { x: 1, y: 2 }

// ① 在 Java 里这行绝无可能编译通过（Point 与 Vector 是两个类）
//    在 TS 里完全合法：形状一样，就是同一个类型
const v: Vector = p
console.log('① 结构相同即兼容：', v)

// ② 多出来的字段也兼容（子类型关系由形状决定）
const labeled = { x: 3, y: 4, label: 'origin' }
const p2: Point = labeled
console.log('② 多字段也可赋值：', p2)

// ③ 但「字面量直接赋值」会触发额外属性检查（excess property check）
//    这是 TS 特意加的一道保险，只对字面量生效
// const p3: Point = { x: 1, y: 2, label: 'oops' } // ← 解开注释看报错

// ④ 连 class 也走结构化判定
//
//    注意这里的写法：不能用 `constructor(public amount: number)` 这种
//    构造器参数属性 —— 它需要编译器生成赋值代码，而 Node 只擦除类型、
//    不做语法转换（tsconfig 的 erasableSyntaxOnly 会直接报错拦下）。
//    所以字段必须显式声明和赋值，写法上更接近 Java。
class Money {
  amount: number
  constructor(amount: number) {
    this.amount = amount
  }
}
class Score {
  amount: number
  constructor(amount: number) {
    this.amount = amount
  }
}
const money: Money = new Score(100) // Java 里不可想象
console.log('④ 不同 class 也能互赋：', money)

/**
 * 后果与对策：
 *
 * 好处：不需要为了类型兼容去继承或实现接口，鸭子类型让组合极其灵活，
 *       mock 测试数据、拼装对象都很轻松。
 *
 * 风险：语义不同但形状相同的类型会被混用 —— 上面 Money 和 Score 都是
 *       { amount: number }，把分数当金额传进去，编译器不会拦你。
 *
 * 对策：品牌类型（branded type），人为制造形状差异来模拟名义类型：
 */

type UserId = string & { readonly __brand: 'UserId' }
type OrderId = string & { readonly __brand: 'OrderId' }

const toUserId = (s: string) => s as UserId

function findUser(id: UserId) {
  return `查询用户 ${id}`
}

const uid = toUserId('u_1001')
console.log('⑤ 品牌类型：', findUser(uid))

// findUser('随便一个字符串')  // ← 解开注释：普通 string 被拒绝
// findUser('o_2001' as OrderId) // ← 解开注释：OrderId 也被拒绝

/**
 * 这个技巧在真实项目里价值很高：ID、金额、时间戳这类「都是 string/number
 * 但绝不能混用」的值，用品牌类型把 Java 式的类型安全找回来。
 */
