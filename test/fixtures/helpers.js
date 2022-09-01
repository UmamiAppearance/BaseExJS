import test from 'ava';

// Basic test for en- and decoding
const baseTest = test.macro((t, input, expected, base, ...args) => {
    const output = base.encode(input, ...args);
    if (expected !== null) {
        t.is(output, expected);
    }
    t.is(base.decode(output, ...args), input);
});


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


export { baseTest, helloWorldArray, randInt, randByte, randArray, randStr };
