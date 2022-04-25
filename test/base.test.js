/* eslint-disable complexity */

import { helloWorldArray, makeError, randArray, randInt, randStr } from "./helpers.js"
import { loadEncodingMap } from "./load-json.js";


async function baseTest(testData, base, IOtestRounds, verbose=false) {
    const encodingMap = await loadEncodingMap();
    const name = base.constructor.name;

    if (verbose) console.log(`Testing ${name}...`);

    testData[name] = new Object();
    testData[name].errorList = new Object();
    testData[name].testCount = 0;
    testData[name].passed = 0;
    testData[name].failed = 0;


    // encoding-list comparison

    // hello world
    if (verbose) console.log(`> Testing 'Hello World!!!' Output.`);
    let testStr = ""; 
    helloWorldArray.forEach(c => {
        testData[name].testCount += 2;
        testData.totalTests += 2;

        testStr = testStr.concat(c);
        const encoded = base.encode(testStr);

        const expectedResult = encodingMap[name].str[testStr];
        
        
        if (encoded === expectedResult) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(testData, name, "hello", testStr, encoded, expectedResult);
        }

        const decoded = base.decode(encoded, "str");

        if (decoded === testStr) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(testData, name, "hello", testStr, decoded, testStr);
        }
    });


    // integers
    if (verbose) console.log(`> Testing Integers Output.`);
    for (const int in encodingMap[name].int) {
        testData[name].testCount += 2;
        testData.totalTests += 2;

        let integer = (int.length > 12) ? BigInt(int) : Number(int);
        const outType = (integer < 0) ? "int_n" : "uint_n";
        
        const encoded = base.encode(integer);

        const expectedResult = encodingMap[name].int[int];

        if (encoded === expectedResult) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(testData, name, "integers", int, encoded, expectedResult);
        }

        const decoded = base.decode(encoded, outType);

        if (decoded === integer) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(testData, name, "integers", decoded, decoded, int);
        }
    }

    // float
    if (verbose) console.log(`> Testing Floating Point Output.`);
    for (const float in encodingMap[name].float) {
        testData[name].testCount += 2;
        testData.totalTests += 2;

        let float64 = Number(float);
        
        const encoded = base.encode(float64);

        const expectedResult = encodingMap[name].float[float];

        if (encoded === expectedResult) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(testData, name, "floating points", float, encoded, expectedResult);
        }

        const decoded = base.decode(encoded, "float_n");

        if (decoded === float64) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(testData, name, "floating points", decoded, decoded, float);
        }
    }

    // number mode
    if (verbose) console.log(`> Testing Number Mode Output.`);
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
    for (const num of numbers) {
        testData[name].testCount++;
        testData.totalTests++;
        
        const encoded = base.encode(num, "number");
        const decoded = base.decode(encoded, "float_n");
        
        if (decoded === num) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(testData, name, "numbers", num, decoded, num);
        }
    }


    const intermediate = [testData[name].testCount, testData[name].failed];
    if (verbose) {
        console.log(`< Tests: ${testData[name].testCount}, failed: ${testData[name].failed}\n`);
        console.log(`> Starting IO tests`);
    }

    // test en- and decoding of random strings and bytes
    for (let i=0; i<IOtestRounds; i++) {

        if (verbose) console.log(`>> Iteration [${i+1}/${IOtestRounds}]`);

        // Prepare random string and bytes
        const testBytesNullStart = new Uint8Array([...randArray(true), ...randArray(false), ...randArray(true), ...randArray(false)]);
        const testBytesNullEnd = new Uint8Array([...randArray(false), ...randArray(true), ...randArray(false), ...randArray(true)]);
        const testBytesX = new Uint8Array(randArray(false, 0, randInt(1, 512)));

        const str16 = randStr(16);
        const str32 = randStr(32);
        const strX = randStr(randInt(0, 512));

        const IOtests = {
            str: [str16, str32, strX],
            bytes: [testBytesNullStart, testBytesNullEnd, testBytesX]
        }
    
        // Test available charsets with string and byte en-/decoding
        for (const charset in base.charsets) {

            if (verbose) console.log(`>>> Testing charset: ${charset}`);

            for (const IOtype of ["str", "bytes"]) {

                if (verbose) console.log(`>>>> Testing type: ${IOtype}`);

                let curCount = 0;
                let curErrors = 0;

                for (const input of IOtests[IOtype]) {
                    curCount++;
                    testData.totalTests++;

                    const encoded = base.encode(input, charset);
                    const decoded = base.decode(encoded, charset, IOtype);

                    const passed = input.toString() === decoded.toString();
                    if (passed) {
                        testData[name].passed++;
                    } else {

                        curErrors++;
                        testData.totalErrors++;
                        makeError(testData, name, `IO-${charset}-${IOtype} #${testData.totalErrors}`, input, decoded, "<=input");
                    }
                }
                if (verbose) console.log(`<<<< Tests: ${curCount}, failed: ${curErrors}\n`);
                testData[name].testCount += curCount;
                testData[name].failed += curErrors;
            } 
        }

        if (verbose) console.log(`_______\n< Tests: ${testData[name].testCount-intermediate[0]}, failed: ${testData[name].failed-intermediate[1]}\n`)
    }
    if (verbose) console.log(`____________\nTotal Result:\nTests: ${testData.totalTests}, failed: ${testData.totalErrors}\n`)
    return true;
}

export { baseTest };
