import * as BaseEx from "../src/base-ex.js";
import { roundUpTests, test, testData } from "./test-core.js";

const excluded = ["Base1", "SimpleBase", "BaseEx"];

async function runTests(IOtestRounds, verbose) {
    // call the set of test for each class if not excluded
    
    const classes = [];

    async function testGroup() {
        const base = classes.shift();
        if (base) {
            test(new BaseEx[base], IOtestRounds, verbose).then(() => testGroup())
        } else {
            roundUpTests(exitFN);
        }
    }
    
    
    for (const cls in BaseEx) {
        if (!excluded.includes(cls)) {
            classes.push(cls);
        }
    }

    testGroup();
}

function exitFN() {
    if (testData.totalErrors === 0) {
        console.log("Everything seems to work fine.");
        process.exit(0);
    } else {
        console.log(`${testData.totalErrors} error(s) occurred.`);
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
