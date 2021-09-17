import {Base16, Base32, Base64, Base85, Base91} from "../dist/BaseEx.min.mjs"
import {test, testData, roundUpTests} from "./test.js"

async function runTests(IOtestRounds, verbose) {
    // call the set of test for each class
    const classes = [new Base16(), new Base32(), new Base64(), new Base85("ascii85", "str", "str", true), new Base91()];
        
    async function testGroup() {
        const base = classes.shift();
        if (base) {
            test(base, IOtestRounds, verbose).then(() =>
                testGroup()
            )
        } else {
            roundUpTests(exitFN);
        }
    };
    testGroup();
}

function exitFN() {
    if (testData.totalErrors === 0) {
        console.log("Everything seems to work fine.");
        process.exit(0);
    } else {
        console.log(`${testData.totalErrors} error(s) occured.`);
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
                default:
                    throw new Error(`Unknown argument: '${arg}'\n Call this programm with "--help" for some advice.`);
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


process.env.NODE_ENV = 'production';
main();
