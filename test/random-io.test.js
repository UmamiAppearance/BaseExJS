import * as BaseEx from "base-ex";
import { baseTest, randArray, randInt, randStr } from "./fixtures/helpers.js";
import test from 'ava';

let ITERATIONS = 4;
process.argv.forEach(arg => {
    if ((/^iter=/).test(arg)) {
        ITERATIONS = arg.split("=").at(1)|0
    }
});

const randBytesTest = test.macro(async (t, input, baseObj) => {
    const output = baseObj.encode(input);
    const backDecoded = baseObj.decode(output, "bytes").toString();
    t.is(backDecoded, input.toString());
});


const randomInputs = (ignoreNullEnd, ignoreNullStart=false) => {

    const noNullStart = !ignoreNullEnd;
    const noNullEnd = !ignoreNullStart;
    
    const randBytesX = new Uint8Array(randArray(false, {
        start: 1,
        end: randInt(1, 512),
        noNullStart,
        noNullEnd
    }));

    const randStr16 = randStr(16);
    const randStr32 = randStr(32);
    const randStrX = randStr(randInt(1, 512));

    const inputs = {
        bytes: {
            randBytesX
        },
        str: {
            randStr16,
            randStr32,
            randStrX
        }
    };

    if (!ignoreNullEnd) {
        inputs.bytes.randBytesNullEnd = new Uint8Array([
            ...randArray(false, {noNullStart}),
            ...randArray(null),
            ...randArray(),
            ...randArray(null)
        ]);
    }
    
    if (!ignoreNullStart) {
        inputs.bytes.randBytesNullStart= new Uint8Array([
            ...randArray(null),
            ...randArray(),
            ...randArray(null),
            ...randArray(false, {noNullEnd})
        ]);
    }
    return inputs;
};


[...Array(ITERATIONS).keys()].forEach(async i => {
    
    Object.keys(BaseEx).forEach(async base => {

        if (base !== "Base1" && base !== "BaseEx" && base !== "SimpleBase") {

            const bFn = new BaseEx[base]();
            const inputs = randomInputs(bFn.littleEndian || base === "ByteConverter");
            
            for (const input in inputs.bytes) {
                test(
                    `Iteration ${i} - Encode and decode back for ${base} (type bytes) with input <${input}>`,
                    randBytesTest,
                    inputs.bytes[input], 
                    bFn
                );
            }

            for (const input in inputs.str) {
                test(
                    `Iteration ${i} - Encode and decode back for ${base} (type string) with input <${input}>`,
                    baseTest,
                    inputs.str[input],
                    null, 
                    bFn,
                    "str"
                );
            }
        }
    });


    for (let radix=2; radix<=36; radix++) {

        const bFn = new BaseEx.SimpleBase(radix);
        const inputs = randomInputs(bFn.littleEndian, (radix === 2 || radix === 16));

        for (const input in inputs.bytes) {
            test(
                `Iteration ${i} - Encode and decode back for SimpleBase${radix} (type bytes) with input <${input}>`,
                randBytesTest,
                inputs.bytes[input], 
                bFn
            );
        }

        for (const input in inputs.str) {
            test(
                `Iteration ${i} - Encode and decode back for SimpleBase${radix} (type string) with input <${input}>`,
                baseTest,
                inputs.str[input],
                null, 
                bFn,
                "str"
            );
        }
    }
});

