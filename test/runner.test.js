import * as BaseEx from "../src/base-ex.js";
import { baseTest } from "./base.test.js";
import { simpleBaseTests } from "./simple-base.test.js";

const EXCLUDED = [
    "Base1",
    "SimpleBase",
    "BaseEx",
    "ByteConverter"
];

// non default charsets
const EXTRA_ARGS = {
    LEB128: ["hex", "signed"]
}

const MAIN_TESTS = [];
for (const cls in BaseEx) {
    if (!EXCLUDED.includes(cls)) {
        MAIN_TESTS.push(cls);
    }
}

const EXTRA_TESTS = [simpleBaseTests];

// Initialize object to store test data
const TEST_DATA = {
    totalTests: 0,
    totalErrors: 0
}

function runTests(IOtestRounds, verbose) {
    // recursive test function
    async function testGroup() {
        if (MAIN_TESTS.length) {
            const base = MAIN_TESTS.shift();
            const instance = (base in EXTRA_ARGS) ? new BaseEx[base](...EXTRA_ARGS[base]) : new BaseEx[base]();
            baseTest(TEST_DATA, instance, IOtestRounds, verbose).then(() => testGroup())
        } else if (EXTRA_TESTS.length) {
            const extraTest = EXTRA_TESTS.shift();
            extraTest(TEST_DATA, verbose).then(testGroup());
        } else {
            summery();
        }
    }
    
    testGroup();
}

function summery() {
    // final function after tests are done

    if (!TEST_DATA.totalErrors) {
        TEST_DATA.successRate = 100;
    } else {
        TEST_DATA.successRate = ((1 - TEST_DATA.totalErrors / TEST_DATA.totalTests) * 100).toFixed(2);
    }
    
    if (TEST_DATA.totalErrors === 0) {
        console.log("Everything seems to work fine.");
        process.exit(0);
    } else {
        console.log(`${TEST_DATA.totalErrors} error(s) occurred.`);
        process.exit(1);
    }
}

function main() {
    const args = process.argv.slice(2); 
    const isDefined = v => (typeof v !== "undefined");
    const testOption = (arg, o) => {
        if (isDefined(o)) {
            return true;
        } else {
            throw new Error(`Option '${arg}' needs an argument.`);
        }
    }
    
    let IOtests = 1;
    let verbose = false;


    function getArgs() {
        const arg = args.shift();
        let option;

        if (isDefined(arg)) {
            switch (arg) {
                case "-iotests":
                    option = args.shift();
                    testOption(arg, option);
                    IOtests = option|0;
                        if (Number.isInteger(IOtests)) {
                            if (IOtests < 1) {
                                IOtests = 1;
                                console.log("Your argument for IOtests is less than one and will be ignored.");
                            } else if (IOtests > 1999) {
                                console.log("Get yourself a coffee. This is a big amount of tests. (ctrl+c to the rescue)");
                            } else if (IOtests > 499) {
                                console.log("You are running a lot of tests. Be patient.");
                            } else if (IOtests > 99) {
                                console.log("This might take a while.");
                            }
                        } else {
                            IOtests = 1;
                            console.log("Your argument for IOtests is no integer and will be ignored.");                            
                        }
                    break;
                case "--verbose":
                    verbose = true;
                    break;
                case "--help":
                    console.log(helpText);
                    process.exit(0);
                    break;
                default:
                    throw new Error(`Unknown argument: '${arg}'\n Call this program with "--help" for some advice.`);
            }
            getArgs();
        }

    }
    getArgs();
    
    runTests(IOtests, verbose);
}

const helpText = `

Arguments:
    -iotests        Takes a positive integer.
                    IO tests produces randomized input,
                    converts it to the currently tested
                    base, converts it back and compares
                    the output of the decoding with the
                    initial input. This happens once by
                    default, but can be repeated n times.

    --verbose       Extra verbose console output.
    
    --help          This help page.

`.trim();

main();
