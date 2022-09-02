import { SimpleBase } from "base-ex";
import { baseTest } from "./fixtures/helpers.js";
import test from "ava";


const Base10 = new SimpleBase(10);
const randInt = (max, min=0) => BigInt(Math.floor(Math.random() * (max - min) + min));

const strToBase = (input, encoder) => {
    const endianness = (encoder.littleEndian) ? "LE" : "BE";
    const b10Integer = BigInt(Base10.encode(input, endianness));
    return b10Integer.toString(encoder.converter.radix);
};

for (let radix=2; radix<=36; radix++) {

    const bFn = new SimpleBase(radix);
    const base = `Base${radix}`;

    // integers
    for (let i=8; i<=1024; i*=2) {

        const n = 2n**BigInt(i);

        for (const signMulti of [1n, -1n]) {

            for (const add of [-randInt(128, 2), -1n, 0n, 1n, randInt(128, 2)]) {

                let input = (n + add) * signMulti;
                
                if (input <= Number.MAX_SAFE_INTEGER && input >= Number.MIN_SAFE_INTEGER) {
                    input = Number(input);
                } 
                
                const expected = input.toString(radix);                    
                const numVal = (input < 0) ? "int_n" : "uint_n";
                const title = `En- and decode ${base} for type Number/BigInt with input '${input}'`;
                
                test(title, baseTest, input, expected, bFn, numVal);
            }            
        }
    }

    // string        
    let helloInput = "";
    "Hello World!!!".split("").forEach(c => {
        helloInput += c;
        const expected = strToBase(helloInput, bFn);
        const title = `En- and decode ${base} for type String with input '${helloInput}'`;
        test(title, baseTest, helloInput, expected, bFn, "str");
    });
}
