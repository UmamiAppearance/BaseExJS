import test from 'ava';

const baseTest = test.macro(async (t, input, expected, base, ...args) => {
    const output = base.encode(input, ...args);
    if (expected !== null) {
        t.is(output, expected);
    }
    t.is(base.decode(output, ...args), input);
});


// Random integer
const randInt = (min, max) => Math.floor(Math.random() * (max - min) + min);

// Random byte value
const randByte = (start=0) => randInt(start, 256);

// Random array with a length (between 8 and 24 by default)
const randArray = (nullBytes, options={}) => {
    
    if (!("start" in options)) options.start = 8;
    if (!("end" in options)) options.end = 24;
    
    const array = new Array();
    const generator = (nullBytes === null) ? () => 0 : () => randByte();
    let i = randInt(options.start, options.end);
    while (i--) {
        array.push(generator());
    }
    if (options.noNullStart && array.at(0) === 0) {
        array[0] = randByte(1);
    } else if (options.noNullEnd && array.at(-1) === 0) {
        array[array.length-1] = randByte(1);
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


export { baseTest, helloWorldArray, randInt, randByte, randArray, randStr };
