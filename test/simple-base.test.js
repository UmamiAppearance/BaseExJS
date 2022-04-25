import { SimpleBase } from "../src/base-ex.js";

function simpleBaseTests(testData, verbose=true) {

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
        testData.SimpleBase[baseName].errorList = new Object();
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
                    testData.SimpleBase.testCount++;
                    testData.SimpleBase[baseName].testCount++;
                    
                    const expected = nn.toString(radix);
                    const output = baseConverter.encode(nn);

                    const passedEnc = output === expected;

                    if (passedEnc) {
                        testData.SimpleBase.passed++;
                        testData.SimpleBase[baseName].passed++;
                    } else {
                        testData.SimpleBase.failed++;
                        testData.SimpleBase[baseName].failed++;
                    }

                    let passedDec = false;
                    if (passedEnc) {
                        if (verbose) console.log("Testing decoding...");
                        testData.SimpleBase.testCount++;
                        testData.SimpleBase[baseName].testCount++;

                        const backDecoded = baseConverter.decode(output, "uint_n");
                        passedDec = backDecoded === nn;

                        if (passedDec) {
                            testData.SimpleBase.passed++;
                            testData.SimpleBase[baseName].passed++;
                        } else {
                            testData.SimpleBase.failed++;
                            testData.SimpleBase[baseName].failed++;
                        }
                    }
                }            
            }
        }

        
        let helloInput = "";
        "Hello World!!!".split("").forEach(c => {
            
            helloInput += c;

            if (verbose) console.log(`Testing String input >>> ${helloInput} <<<`);
            if (verbose) console.log("Testing encoding...");
            testData.SimpleBase.testCount++;
            testData.SimpleBase[baseName].testCount++;        

            const expected = strToBase(helloInput, baseConverter);
            const output = baseConverter.encode(helloInput);

            const passedEnc = output === expected;

            if (passedEnc) {
                testData.SimpleBase.passed++;
                testData.SimpleBase[baseName].passed++;
            } else {
                testData.SimpleBase.failed++;
                testData.SimpleBase[baseName].failed++;
            }

            let passedDec = false;
            
            if (passedEnc) {
                if (verbose) console.log("Testing decoding...");
                testData.SimpleBase.testCount++;
                testData.SimpleBase[baseName].testCount++;
                
                const backDecoded = baseConverter.decode(output, "str");
                passedDec = backDecoded === helloInput;

                if (passedDec) {
                    testData.SimpleBase.passed++;
                    testData.SimpleBase[baseName].passed++;
                } else {
                    testData.SimpleBase.failed++;
                    testData.SimpleBase[baseName].failed++;
                }
            }
        });
    }
    console.log(testData);
}

const testData = {
    totalTests: 0,
    totalErrors: 0
}

simpleBaseTests(testData);
