import { Base1, SimpleBase } from "../src/base-ex.js";
import { makeError } from "./helpers.js";

function base1Test(testData, verbose=false) {
    if (verbose) console.log("Testing Base 1 Converter...");

    const base1 = new Base1();
    const base10 = new SimpleBase(10);

    testData.Base1 = new Object();
    testData.Base1.errorList = new Object();
    testData.Base1.testCount = 0;
    testData.Base1.passed = 0;
    testData.Base1.failed = 0;

    if (verbose) console.log("> Testing String Input");
    if (verbose) console.log(">> Testing encoding");
    testData.Base1.testCount++;
    testData.totalTests++;

    let input = "str";
    const str1 = base1.encode(input);
    const str10 = base10.encode(input);

    let passed;
    if (str1.length == str10) {
        passed = true;
        testData.Base1.passed++;
    } else {
        passed = false;
        testData.Base1.failed++;
        testData.totalErrors++;
        makeError(testData, "Base1", "string", input, `${str1.length} x 1`, `${str10} x 1`);
    }

    if (passed) {
        if (verbose) console.log(">> Testing decoding");
        testData.Base1.testCount++;
        testData.totalTests++;

        const output = base1.decode(str1, "str");
        if (output === input) {
            testData.Base1.passed++;
        } else {
            testData.Base1.failed++;
            testData.totalErrors++;
            makeError(testData, "Base1", "string", `${str1.length} x 1`, output, input);
        }
    } 
}

const testData = {
    totalTests: 0,
    totalErrors: 0
}

base1Test(testData, true);