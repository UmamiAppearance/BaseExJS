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


// In the case of a error run this function to store it and alert 
function makeError(testData, className, unit, input, output, expected) {
    if (!(unit in testData[className].errorList)) testData[className].errorList[unit] = new Object();
    testData[className].errorList[unit].input = input;
    testData[className].errorList[unit].output = output;
    testData[className].errorList[unit].expected = expected;
    console.error(`___\nFound error while testing class: '${className}', unit: '${unit}'\n\ninput: ${input}\noutput: ${output}\nexpected: ${expected}\n`);
}

export { helloWorldArray, makeError, randInt, randByte, randArray, randStr };
