import {Base16, Base32, Base64, Base85, BaseEx} from "../src/BaseEx.js"

// Testdata

// Random integer
const randInt = (min, max) => Math.floor(Math.random() * (max - min) + min);

// Random byte value
const randByte = () => randInt(0, 256);

// Random array with a lenght between 8 and 24
const randArray = (nullBytes) => {
    const array = new Array();
    const dataGenerator = (nullBytes) ? () => 0 : () => randByte();
    let i = randInt(8, 24);
    while (i--) {
        array.push(dataGenerator());
    }
    return array
}

const randChar = () => String.fromCharCode(randInt(32, 127));

const randStr = (len) => {
    const array = new Uint8Array(len);
    array.forEach((b, i) => array[i] = randInt(32, 127));
    return new TextDecoder("ascii").decode(array);
}

const testStr = "Hello World!";
const testBytes = new Uint8Array([...randArray(true), ...randArray(false), ...randArray(true), ...randArray(false)]);

