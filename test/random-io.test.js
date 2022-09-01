import * as BaseEx from "base-ex";
import { baseTest, randArray, randInt, randStr } from "./fixtures/helpers.js";
import test from 'ava';

const randBytesTest = test.macro((t, input, baseObj) => {
    const output = baseObj.encode(input);
    t.is(baseObj.decode(output, "bytes").toString(), input.toString());
});


const randomInputs = (ignoreNullEnd, ignoreNullStart=false) => {
    const randBytesX = new Uint8Array(randArray(false, 0, randInt(1, 512)));

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

    // FIXME: ALSO THE OTHER BYTES WITH 0 AT START OR END
    if (!ignoreNullEnd) {
        inputs.bytes.randBytesNullEnd = new Uint8Array([...randArray(), ...randArray(null), ...randArray(), ...randArray(null)]);
    } else if (randBytesX.at(-1) === 0) {
        inputs.bytes.randBytesX[randBytesX.length-1] = 1;
    }
    if (!ignoreNullStart) {
        inputs.bytes.randBytesNullStart= new Uint8Array([...randArray(null), ...randArray(), ...randArray(null), ...randArray()]);
    } else if (randBytesX.at(0) === 0) {
        inputs.bytes.randBytesX[0] = 1;
    }
    return inputs;
};


for (const base in BaseEx) {

    if (base !== "Base1" && base !== "BaseEx" && base !== "SimpleBase") {

        const bFn = new BaseEx[base]();
        const inputs = randomInputs(bFn.littleEndian || base === "ByteConverter");

        for (const input in inputs.bytes) {
            test(
                `Encode and decode back for ${base} (type bytes) with input <${input}>`,
                randBytesTest,
                inputs.bytes[input], 
                bFn
            );
        }

        for (const input in inputs.str) {
            test(
                `Encode and decode back for ${base} (type string) with input <${input}>`,
                baseTest,
                inputs.str[input],
                null, 
                bFn,
                "str"
            );
        }
    }
}


for (let radix=2; radix<=36; radix++) {

    const bFn = new BaseEx.SimpleBase(radix);
    const inputs = randomInputs(bFn.littleEndian, (radix === 2 || radix === 16));

    for (const input in inputs.bytes) {
        test(
            `Encode and decode back for SimpleBase${radix} (type bytes) with input <${input}>`,
            randBytesTest,
            inputs.bytes[input], 
            bFn
        );
    }

    for (const input in inputs.str) {
        test(
            `Encode and decode back for SimpleBase${radix} (type string) with input <${input}>`,
            baseTest,
            inputs.str[input],
            null, 
            bFn,
            "str"
        );
    }
}
