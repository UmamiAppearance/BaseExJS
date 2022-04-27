import { helloWorldArray, makeError } from "./helpers.js";
import { SimpleBase } from "../src/base-ex.js";


async function simpleBaseTests(testData, verbose=false) {

    if (verbose) console.log("Testing Simple Base Converters...");
    testData.SimpleBase = new Object();
    testData.SimpleBase.errorList = new Object();
    testData.SimpleBase.testCount = 0;
    testData.SimpleBase.passed = 0;
    testData.SimpleBase.failed = 0;

    const Base10 = new SimpleBase(10);
    const randInt = (max, min=0) => BigInt(Math.floor(Math.random() * (max - min) + min));

    const strToBase = (input, encoder) => {
        const endianness = (encoder.littleEndian) ? "LE" : "BE";
        const b10Integer = BigInt(Base10.encode(input, endianness));
        return b10Integer.toString(encoder.converter.radix);
    };

    for (let radix=2; radix<=36; radix++) {

        if (verbose) console.log(`Testing Radix: ${radix}`);
        const baseConverter = new SimpleBase(radix);
        const baseName = `Base${radix}`;
        testData.SimpleBase[baseName] = new Object();
        testData.SimpleBase[baseName].testCount = 0;
        testData.SimpleBase[baseName].passed = 0;
        testData.SimpleBase[baseName].failed = 0;

        for (let i=8; i<=1024; i*=2) {

            const n = 2n**BigInt(i);

            for (const signMulti of [1n, -1n]) {

                for (const add of [-randInt(128, 2), -1n, 0n, 1n, randInt(128, 2)]) {

                    let nn = (n + add) * signMulti;
                    
                    if (nn <= Number.MAX_SAFE_INTEGER && nn >= Number.MIN_SAFE_INTEGER) {
                        nn = Number(nn);
                    } 

                    if (verbose) console.log(`Testing Number input >>> ${nn} <<<`);
                    if (verbose) console.log("Testing encoding...");
                    testData.totalTests++;
                    testData.SimpleBase.testCount++;
                    testData.SimpleBase[baseName].testCount++;
                    
                    const expected = nn.toString(radix);
                    const output = baseConverter.encode(nn);

                    const passedEnc = output === expected;

                    if (passedEnc) {
                        testData.SimpleBase.passed++;
                        testData.SimpleBase[baseName].passed++;
                    } else {
                        testData.totalErrors++;
                        testData.SimpleBase.failed++;
                        testData.SimpleBase[baseName].failed++;
                        makeError(testData, "SimpleBase", `base${radix}-numbers-encoding`, nn, output, expected);
                    }

                    let passedDec = false;
                    if (passedEnc) {
                        if (verbose) console.log("Testing decoding...");
                        testData.totalTests++;
                        testData.SimpleBase.testCount++;
                        testData.SimpleBase[baseName].testCount++;

                        const backDecoded = baseConverter.decode(output, "int_n");
                        passedDec = backDecoded === nn;

                        if (passedDec) {
                            testData.SimpleBase.passed++;
                            testData.SimpleBase[baseName].passed++;
                        } else {
                            testData.totalErrors++;
                            testData.SimpleBase.failed++;
                            testData.SimpleBase[baseName].failed++;
                            makeError(testData, "SimpleBase", `base${radix}-numbers-decoding`, output, backDecoded, nn);
                        }
                    }
                }            
            }
        }

        
        let helloInput = "";
        helloWorldArray.forEach(c => {
            
            helloInput += c;

            if (verbose) console.log(`Testing String input >>> ${helloInput} <<<`);
            if (verbose) console.log("Testing encoding...");
            testData.totalTests++;
            testData.SimpleBase.testCount++;
            testData.SimpleBase[baseName].testCount++;        

            const expected = strToBase(helloInput, baseConverter);
            const output = baseConverter.encode(helloInput);

            const passedEnc = output === expected;

            if (passedEnc) {
                testData.SimpleBase.passed++;
                testData.SimpleBase[baseName].passed++;
            } else {
                testData.totalErrors++;
                testData.SimpleBase.failed++;
                testData.SimpleBase[baseName].failed++;
                makeError(testData, "SimpleBase", `base${radix}-hello-encoding`, helloInput, output, expected);
            }

            let passedDec = false;
            
            if (passedEnc) {
                if (verbose) console.log("Testing decoding...");
                testData.totalTests++;
                testData.SimpleBase.testCount++;
                testData.SimpleBase[baseName].testCount++;
                
                const backDecoded = baseConverter.decode(output, "str");
                passedDec = backDecoded === helloInput;

                if (passedDec) {
                    testData.SimpleBase.passed++;
                    testData.SimpleBase[baseName].passed++;
                } else {
                    testData.totalErrors++;
                    testData.SimpleBase.failed++;
                    testData.SimpleBase[baseName].failed++;
                    makeError(testData, "SimpleBase", `base${radix}-hello-decoding`, output, backDecoded, helloInput);
                }
            }
        });
    }
    return true;
}

export { simpleBaseTests };
