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

    const name = base.constructor.name;

    if (verbose) console.log(`Testing ${name}...`);

    testData[name] = new Object();
    testData[name].errorList = new Object();
    testData[name].testCount = 0;
    testData[name].passed = 0;
    testData[name].failed = 0;
    
    if (verbose) console.log(`> Testing 'Hello World!!!' output.`);

    // encoding-list comparison
    let testStr = ""; 
    helloWorldArray.forEach(c => {
        testData[name].testCount += 2;
        testData.totalTests += 2;

        testStr = testStr.concat(c);
        const encoded = base.encode(testStr);
        const expectedResult = encodingList[name].get(testStr);
        
        if (encoded === expectedResult) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(name, "hello", testStr, encoded, expectedResult);
        }

        const decoded = base.decode(encoded);

        if (decoded === testStr) {
            testData[name].passed++;
        } else {
            testData[name].failed++;
            testData.totalErrors++;
            makeError(name, "hello", testStr, decoded, testStr);
        }
    });

    const intermediate = [testData[name].testCount, testData[name].failed];
    if (verbose) {
        console.log(`< Tests: ${testData[name].testCount}, failed: ${testData[name].failed}\n`);
        console.log(`> Starting IO tests`);
    };


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

            for (const IOtype of base.IOtypes) {

                if (verbose) console.log(`>>>> Testing type: ${IOtype}`);

                let curCount = 0;
                let curErrors = 0;

                for (const input of IOtests[IOtype]) {
                    curCount++;
                    testData.totalTests++;

                    const encoded = base.encode(input, charset, IOtype);
                    const decoded = base.decode(encoded, charset, IOtype);

                    const passed = (IOtype === "bytes") ? (input.join("") === decoded.join("")) : (input === decoded);
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
    if (!Boolean(testData.totalErrors)) {
        testData.successRate = 100;
    } else {
        testData.successRate = ((1 - testData.totalErrors / testData.totalTests) * 100).toFixed(2);
    }
    callback();
}

export {test, testData, randInt, roundUpTests};
