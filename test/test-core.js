/* eslint-disable complexity */
// +++++++++++++ Test data +++++++++++++ //

import { loadEncodingMap } from "./load-json.js";


// Random integer
const randInt = (min, max) => Math.floor(Math.random() * (max - min) + min);

// Random byte value
const randByte = () => randInt(0, 256);

// Random array with a length (between 8 and 24 by default)
const randArray = (nullBytes, start=8, end=24) => {
    const array = new Array();
    const dataGenerator = (nullBytes) ? () => 0 : () => randByte();
    let i = randInt(start, end);
    while (i--) {
        array.push(dataGenerator());
    }
    return array
}

// Random string of printable ascii-chars including space
const randStr = (len) => {
    const array = new Uint8Array(len);
    array.forEach((b, i) => array[i] = randInt(32, 127));
    return new TextDecoder("ascii").decode(array);
}

// Generated pre decoded strings for each base
const helloWorldArray = "Hello World!!!".split("");


// +++++++++++++ Utilities +++++++++++++ //

// Initialize object to store test data
const testData = {
    totalTests: 0,
    totalErrors: 0
}

// In the case of a error run this function to store it and alert 
function makeError(className, unit, input, output, expected) {
    if (!(unit in testData[className].errorList)) testData[className].errorList[unit] = new Object();
    testData[className].errorList[unit].input = input;
    testData[className].errorList[unit].output = output;
    testData[className].errorList[unit].expected = expected;
    console.error(`___\nFound error while testing class: '${className}', unit: '${unit}'\n\ninput: ${input}\noutput: ${output}\nexpected: ${expected}\n`);
}

// +++++++++++++ Running the tests +++++++++++++ //
async function test(base, IOtestRounds, verbose=false) {
    // main test function, builds one
    // set of tests for one class

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
    if (verbose) console.log(`> Testing 'Hello World!!!' output.`);
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
            makeError(name, "hello", testStr, encoded, expectedResult);
        }

        const decoded = base.decode(encoded, "str");

        if (decoded === testStr) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(name, "hello", testStr, decoded, testStr);
        }
    });


    // integers
    if (verbose) console.log(`> Testing Integers output.`);
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
            makeError(name, "integers", int, encoded, expectedResult);
        }

        const decoded = base.decode(encoded, outType);

        if (decoded === integer) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(name, "integers", int, decoded, int);
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
                        makeError(name, `IO-${charset}-${IOtype} #${testData.totalErrors}`, input, decoded, "<=input");
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

function roundUpTests(callback) {
    // final function after tests are done
    if (!testData.totalErrors) {
        testData.successRate = 100;
    } else {
        testData.successRate = ((1 - testData.totalErrors / testData.totalTests) * 100).toFixed(2);
    }
    callback();
}

export {test, testData, randInt, roundUpTests};
