import * as BaseEx from "base-ex";
import { baseTest } from "./fixtures/helpers.js";
import test from 'ava';


const numbers = [
    -Number.MAX_VALUE,
    -(2**256),
    -(2**128),
    -(2**64),
    -(2**32),
    -(2**16),
    -(2**8),
    -2,
    -1.23456789,
    -Number.MIN_VALUE,
    0,
    Number.MIN_VALUE,
    1.23456789,
    2**16,
    2**32,
    2**64,
    2**128,
    2**256,
    Number.MAX_VALUE
];

const numbersNoMIN = [
    ...numbers.slice(0, 9),
    0,
    ...numbers.slice(12)
];


for (const base in BaseEx) {

    if (base !== "Base1" && base !== "BaseEx" && base !== "SimpleBase") {

        let bFn, num;

        if (base === "LEB128") {
            bFn = new BaseEx[base]("number", "signed");
            num = numbersNoMIN;
        }

        else if (base === "BasePhi") {
            bFn = new BaseEx.BasePhi("number"); 
            num = numbersNoMIN;
        }
        
        else {
            bFn = new BaseEx[base]("number");
            num = numbers;
        }

        for (const n of num) {   
            test(
                `Encode and decode back for ${base} with input '${n}'`,
                baseTest,
                n,
                null, 
                bFn
            );
        }
    }
}


for (let radix=2; radix<=62; radix++) {
    const bFn = new BaseEx.SimpleBase(radix, "number");
    
    for (const n of numbersNoMIN) {   
        test(
            `Encode and decode back for SimpleBase${radix} with input '${n}'`,
            baseTest,
            n,
            null, 
            bFn
        );
    }
}
