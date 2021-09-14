import {Base16, Base32, Base64, Base85, Base91} from "../src/BaseEx.js"

// +++++++++++++ Testdata +++++++++++++ //

// Random integer
const randInt = (min, max) => Math.floor(Math.random() * (max - min) + min);

// Random byte value
const randByte = () => randInt(0, 256);

// Random array with a lenght (between 8 and 24 by default)
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

// Generated predecoded strings for each base
const encodingList = new Object();
const helloWorldArray = "Hello World!!!".split("");

// Base16
encodingList.Base16 = new Map();
encodingList.Base16.set("H",                 "48");
encodingList.Base16.set("He",                "4865");
encodingList.Base16.set("Hel",               "48656c");
encodingList.Base16.set("Hell",              "48656c6c");
encodingList.Base16.set("Hello",             "48656c6c6f");
encodingList.Base16.set("Hello ",            "48656c6c6f20");
encodingList.Base16.set("Hello W",           "48656c6c6f2057");
encodingList.Base16.set("Hello Wo",          "48656c6c6f20576f");
encodingList.Base16.set("Hello Wor",         "48656c6c6f20576f72");
encodingList.Base16.set("Hello Worl",        "48656c6c6f20576f726c");
encodingList.Base16.set("Hello World",       "48656c6c6f20576f726c64");
encodingList.Base16.set("Hello World!",      "48656c6c6f20576f726c6421");
encodingList.Base16.set("Hello World!!",     "48656c6c6f20576f726c642121");
encodingList.Base16.set("Hello World!!!",    "48656c6c6f20576f726c64212121");

// Base32 (rfc3548)
encodingList.Base32 = new Map();
encodingList.Base32.set("H",                 "90======");
encodingList.Base32.set("He",                "91IG====");
encodingList.Base32.set("Hel",               "91IMO===");
encodingList.Base32.set("Hell",              "91IMOR0=");
encodingList.Base32.set("Hello",             "91IMOR3F");
encodingList.Base32.set("Hello ",            "91IMOR3F40======");
encodingList.Base32.set("Hello W",           "91IMOR3F41BG====");
encodingList.Base32.set("Hello Wo",          "91IMOR3F41BMU===");
encodingList.Base32.set("Hello Wor",         "91IMOR3F41BMUSG=");
encodingList.Base32.set("Hello Worl",        "91IMOR3F41BMUSJC");
encodingList.Base32.set("Hello World",       "91IMOR3F41BMUSJCCG======");
encodingList.Base32.set("Hello World!",      "91IMOR3F41BMUSJCCGGG====");
encodingList.Base32.set("Hello World!!",     "91IMOR3F41BMUSJCCGGI2===");
encodingList.Base32.set("Hello World!!!",    "91IMOR3F41BMUSJCCGGI288=");

// Base64
encodingList.Base64 = new Map();
encodingList.Base64.set("H",                 "SA==");
encodingList.Base64.set("He",                "SGU=");
encodingList.Base64.set("Hel",               "SGVs");
encodingList.Base64.set("Hell",              "SGVsbA==");
encodingList.Base64.set("Hello",             "SGVsbG8=");
encodingList.Base64.set("Hello ",            "SGVsbG8g");
encodingList.Base64.set("Hello W",           "SGVsbG8gVw==");
encodingList.Base64.set("Hello Wo",          "SGVsbG8gV28=");
encodingList.Base64.set("Hello Wor",         "SGVsbG8gV29y");
encodingList.Base64.set("Hello Worl",        "SGVsbG8gV29ybA==");
encodingList.Base64.set("Hello World",       "SGVsbG8gV29ybGQ=");
encodingList.Base64.set("Hello World!",      "SGVsbG8gV29ybGQh");
encodingList.Base64.set("Hello World!!",     "SGVsbG8gV29ybGQhIQ==");
encodingList.Base64.set("Hello World!!!",    "SGVsbG8gV29ybGQhISE=");

// Base85
encodingList.Base85 = new Map();
encodingList.Base85.set("H",                 "8,");
encodingList.Base85.set("He",                "87_");
encodingList.Base85.set("Hel",               "87cT");
encodingList.Base85.set("Hell",              "87cUR");
encodingList.Base85.set("Hello",             "87cURDZ");
encodingList.Base85.set("Hello ",            "87cURD]f");
encodingList.Base85.set("Hello W",           "87cURD]i*");
encodingList.Base85.set("Hello Wo",          "87cURD]i,\"");
encodingList.Base85.set("Hello Wor",         "87cURD]i,\"EW");
encodingList.Base85.set("Hello Worl",        "87cURD]i,\"Ebk");
encodingList.Base85.set("Hello World",       "87cURD]i,\"Ebo7");
encodingList.Base85.set("Hello World!",      "87cURD]i,\"Ebo80");
encodingList.Base85.set("Hello World!!",     "87cURD]i,\"Ebo80+T");
encodingList.Base85.set("Hello World!!!",    "87cURD]i,\"Ebo80+X$");

// Base91
encodingList.Base91 = new Map();
encodingList.Base91.set("H",                 ".A");
encodingList.Base91.set("He",                ">OD");
encodingList.Base91.set("Hel",               ">OwJ");
encodingList.Base91.set("Hell",              ">OwJb");
encodingList.Base91.set("Hello",             ">OwJh>A");
encodingList.Base91.set("Hello ",            ">OwJh>$A");
encodingList.Base91.set("Hello W",           ">OwJh>IoF");
encodingList.Base91.set("Hello Wo",          ">OwJh>Io0T");
encodingList.Base91.set("Hello Wor",         ">OwJh>Io0T5");
encodingList.Base91.set("Hello Worl",        ">OwJh>Io0Tv!B");
encodingList.Base91.set("Hello World",       ">OwJh>Io0Tv!lE");
encodingList.Base91.set("Hello World!",      ">OwJh>Io0Tv!8PE");
encodingList.Base91.set("Hello World!!",     ">OwJh>Io0Tv!8P7L");
encodingList.Base91.set("Hello World!!!",    ">OwJh>Io0Tv!8P7LhA");


// +++++++++++++ Utilities +++++++++++++ //

// Initialize object to store test data
const tests = {
    totalTests: 0,
    totalErrors: 0
}

// In the case of a error run this function to store it and alert 
function makeError(className, unit, input, output, expected) {
    if (!(unit in tests[className].errorList)) tests[className].errorList[unit] = new Object();
    tests[className].errorList[unit].input = input;
    tests[className].errorList[unit].output = output;
    tests[className].errorList[unit].expected = expected;
    console.error(`Found error while testing class ${className}\n\ninput: ${input}\n\noutput: ${output}\n\nexpected: ${expected}`);
}

// +++++++++++++ Running the tests +++++++++++++ //
async function test(base, IOtestRounds) {
    // main test function, builds one
    // set of tests for one class

    const name = base.constructor.name;

    tests[name] = new Object();
    tests[name].errorList = new Object();
    tests[name].testCount = 0;
    tests[name].passed = 0;
    tests[name].failed = 0;
    
    // encoding-list comparison
    let testStr = ""; 
    helloWorldArray.forEach(c => {
        tests[name].testCount += 2;
        tests.totalTests += 2;

        testStr = testStr.concat(c);
        const encoded = base.encode(testStr);
        const expectedResult = encodingList[name].get(testStr);
        
        if (encoded === expectedResult) {
            tests[name].passed++;
        } else {
            tests[name].failed++;
            tests.totalErrors++;
            makeError(name, "hello", testStr, encoded, expectedResult);
        }

        const decoded = base.decode(encoded);

        if (decoded === testStr) {
            tests[name].passed++;
        } else {
            tests[name].failed++;
            tests.totalErrors++;
            makeError(name, "hello", testStr, decoded, testStr);
        }
    });


    // test en- and decoding of random strings and bytes
    for (let i=0; i<IOtestRounds; i++) {

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
            for (const IOtype of base.IOtypes) {
                for (const input of IOtests[IOtype]) {
                    tests[name].testCount++;
                    tests.totalTests++;

                    const encoded = base.encode(input, charset, IOtype);
                    const decoded = base.decode(encoded, charset, IOtype);

                    const passed = (IOtype === "bytes") ? (input.join("") === decoded.join("")) : (input === decoded);
                    if (passed) {
                        tests[name].passed++;
                    } else {
                        tests[name].failed++;
                        tests.totalErrors++;
                        makeError(name, `IO-${charset}-${IOtype} #${tests.totalErrors}`, input, decoded, "<=input");
                    }
                }
            }    
        }
    }
    return true;
}

async function runTests(e, IOtestRounds=randInt(42, 72)) {
    // call the set of test for each class
    const classes = [new Base16(), new Base32(), new Base64(), new Base85(), new Base91()];
    let stage = 1;
        
    async function testGroup() {
        const base = classes.shift();
        if (base) {
            test(base, IOtestRounds).then(() =>
                updateDOM(stage++).then(() =>
                    window.requestAnimationFrame(testGroup)
                )
            )
        } else {
            finishTests();
        }
    };
    testGroup();
}

async function updateDOM(stage) {
    // visual feedback
    const main = document.querySelector("main");
    main.className = `stage-${stage}`;
    
    const oldStage = main.querySelector(`.stage-${stage-1}`);
    oldStage.classList.remove("pending");

    if (stage === 5) {
        const results = main.querySelector(`article.stage-${stage}`);
        main.querySelector(".pending").classList.remove("pending");
        results.classList.add("show-results");
    };
}

function finishTests() {
    // final function after tests are done
    if (!Boolean(tests.totalErrors)) {
        tests.successRate = 100;
    } else {
        tests.successRate = ((1 - tests.totalErrors / tests.totalTests) * 100).toFixed(2);
    }
    makeTable();

}

function makeTable() {
    // visualize the data in a table

    const table = document.querySelector("table");

    for (const className of ["Base16", "Base32", "Base64", "Base85", "Base91"]) {
        const row = table.querySelector(`.${className}`);
        const cells = row.querySelectorAll("td");

        cells[0].textContent = tests[className].passed;
        cells[1].textContent = tests[className].failed;
        cells[2].textContent = tests[className].testCount;
    }

    const total = table.querySelector(".totalRow");
    const tCells = total.querySelectorAll("td");
    tCells[0].textContent = tests.totalTests - tests.totalErrors;
    tCells[1].textContent = tests.totalErrors;
    tCells[2].textContent = tests.totalTests;

    document.querySelector("#rate").textContent = `${tests.successRate}%`;

    //write results to console 
    console.log(tests);

    // generate a downloadable json file
    makeFile();
}

async function newTest() {
    // re-run tests
    const main = document.querySelector("main");
    main.className = "stage-0";

    main.querySelector("h2").className = "pending";
    main.querySelectorAll("li").forEach((li, i) => li.className = `stage-${i} pending`);
    main.querySelector(".show-results").classList.remove("show-results");

    setTimeout(runTests);
}

function makeFile() {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`
    const downloadBtn = document.querySelector("#download");
    const jsonObj = JSON.stringify(tests, null, 4);
    downloadBtn.setAttribute("href", `data:text/plain;charset=utf-8,${encodeURIComponent(jsonObj)}`);
    downloadBtn.setAttribute("download", `BaseEx-TestSuite-${dateStr}.json`);
  }

document.addEventListener("DOMContentLoaded", runTests, false);
document.querySelector("button").addEventListener("click", newTest, false);