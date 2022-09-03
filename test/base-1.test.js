import { Base1, SimpleBase } from "base-ex";
import { randInt } from "./fixtures/helpers.js";
import test from "ava";


const b1Test = test.macro(async (t, input, expectedLen, base, ...args) => {
    const output = base.encode(input, ...args);
    t.is(output.length, expectedLen);
    t.is(base.decode(output, ...args), input);
});

const bFn = new Base1();
const base10 = new SimpleBase(10);

// string
let input = "str";
let expectedLen = base10.encode(input)|0;
const title = `En- and decode Base1 for type String with input 'str'`;

test(title, b1Test, input, expectedLen, bFn, "str");


// integers
for (let i=0; i<2; i++) {
    
    const int = ["Uint", "Int"].at(i); 
    const signMulti = [1, -1].at(i);
    const arg = `${int.toLowerCase()}_n`;

    input = randInt(256, 2**24);
    
    // raise by one if negative sign is present 
    expectedLen = input + i;
    input *= signMulti;
    
    const title = `En- and decode Base1 for type Integer with input '${input}'`;

    test(title, b1Test, input, expectedLen, bFn, arg);
}
