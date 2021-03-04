class Person {
  static aa() {
    console.log("aa");
  }

  static bb() {
    console.log("bb");
  }

  say() {
    console.log(Person.nam + " " + this.age);
  }

  *aa() {
    yield* [1, 2, 3, 4, 5].entries();
  }

  *[Symbol.iterator]() {
    yield* [1, 2, 3, 4, 5];
  }

  async *[Symbol.asyncIterator]() {
    for (const i of [1, 2, 3, 4, 5]) {
      yield Promise.resolve(i);
    }
  }

  *[Symbol.asyncIterator]() {
    yield "hello";
    yield "async";
    yield "iteration!";
  }
}

Person.aa();
new Person.constructor();
Person.bb();
Person.nam = "aaa";
Person.prototype.age = "bbb";
new Person().say();
// (function(name) {
//   var name1 = name;
// })("aa");
// console.log(name1);
// for (const i of new Person().aa()) {
//   console.log(i);
// }
const bb = new Person();
for (const x of bb) {
  console.log(x);
}
(async () => {
  for await (const x of bb) {
    console.log(x);
  }
})();
