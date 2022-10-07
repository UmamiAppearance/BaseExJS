import { SimpleBase } from "base-ex";
import { baseTest } from "./fixtures/helpers.js";
import test from "ava";

/**
 * Transpiled python code from an online tutorial
 * to have the change to compare bases gt 36
 * 
 * @see: https://www.tutorialexample.com/python-convert-decimal-to-62-base-a-completed-guide-python-tutorial/
 */
const b62 = {

    charset: [..."0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"],

    divmod: (x, y) => [ BigInt(x) / BigInt(y), BigInt(x) % BigInt(y) ],

    encode: (n, radix) => {
        let negative = false;

        if (n < 0) {
            n = -n;
            negative = true;
        }
        if (n == 0) {
            return 0;
        }
        const arr = [];
        let r;
        while (n > 0) {
            [n, r] = b62.divmod(n, radix);
            arr.unshift(b62.charset[r]);
        }
        let output = arr.join("");
        if (negative) {
            output = `-${output}`;
        }
        return output;
    }
}


const Base10 = new SimpleBase(10);
const randInt = (max, min=0) => BigInt(Math.floor(Math.random() * (max - min) + min));

const strToBase = (input, encoder) => {
    const endianness = (encoder.littleEndian) ? "LE" : "BE";
    const b10Integer = BigInt(Base10.encode(input, endianness));
    const radix = encoder.converter.radix;

    const output = radix > 36
        ? b62.encode(b10Integer, radix)
        : b10Integer.toString(radix);
    
    return output;
};

for (let radix=2; radix<=62; radix++) {

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

                const expected = radix > 36
                    ? b62.encode(input, radix)
                    : input.toString(radix);

                const numVal = (input < 0) ? "int_n" : "uint_n";
                const title = `En- and decode Simple${base} for type Number/BigInt with input '${input}'`;

                test(title, baseTest, input, expected, bFn, numVal);
            }            
        }
    }

    // string        
    let helloInput = "";
    "Hello World!!!".split("").forEach(c => {
        helloInput += c;
        const expected = strToBase(helloInput, bFn);
        const title = `En- and decode Simple${base} for type String with input '${helloInput}'`;
        test(title, baseTest, helloInput, expected, bFn, "str");
    });
}
