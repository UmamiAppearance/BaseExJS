import * as BaseEx from "base-ex";
import { baseTest, randArray, randInt, randStr } from "./fixtures/helpers.js";
import test from 'ava';

const randBytesTest = test.macro((t, input, baseObj) => {
    const output = baseObj.encode(input);
    t.is(baseObj.decode(output, "bytes").toString(), input.toString());
});


const randomInputs = (ignoreNullEnd) => {
    console.log("littleEndian", ignoreNullEnd);
    const randBytesNullStart = new Uint8Array([...randArray(true), ...randArray(false), ...randArray(true), ...randArray(false)]);
    const randBytesX = new Uint8Array(randArray(false, 0, randInt(0, 512)));

    const randStr16 = randStr(16);
    const randStr32 = randStr(32);
    const randStrX = randStr(randInt(1, 512));

    const inputs = {
        bytes: {
            randBytesNullStart,
            randBytesX
        },
        str: {
            randStr16,
            randStr32,
            randStrX
        }
    };

    if (!ignoreNullEnd) {
        inputs.bytes.randBytesNullEnd = new Uint8Array([...randArray(false), ...randArray(true), ...randArray(false), ...randArray(true)]);
    }
    return inputs;
};

for (const base in BaseEx) {

    if (base !== "Base1" && base !== "BaseEx" && base !== "SimpleBase") {

        const bFn = new BaseEx[base]();
        console.log(base);
        const inputs = randomInputs(bFn.littleEndian || base === "ByteConverter");

        for (const input in inputs.bytes) {
            test(
                `Encode and decode back for ${base} (type bytes) with input ${input}`,
                randBytesTest,
                inputs.bytes[input], 
                bFn
            );
        }

        for (const input in inputs.str) {
            test(
                `Encode and decode back for ${base} (type string) with input ${input}`,
                baseTest,
                inputs.str[input],
                null, 
                bFn,
                "str"
            );
        }
    }
}
