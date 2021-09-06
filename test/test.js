import {Base16, Base32, Base64, Base85, Base91, BaseEx} from "../src/BaseEx.js"

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

// Random string of printable ascii-chars including space
const randStr = (len) => {
    const array = new Uint8Array(len);
    array.forEach((b, i) => array[i] = randInt(32, 127));
    return new TextDecoder("ascii").decode(array);
}

const testBytesNullStart = new Uint8Array([...randArray(true), ...randArray(false), ...randArray(true), ...randArray(false)]);
const testBytesNullEnd = new Uint8Array([...randArray(false), ...randArray(true), ...randArray(false), ...randArray(true)]);

// Generated predecoded strings for each base
const encoded = new Object();

// Base16
encoded.Base16 = new Map();
encoded.Base16.set("H",                 "48");
encoded.Base16.set("He",                "4865");
encoded.Base16.set("Hel",               "48656c");
encoded.Base16.set("Hell",              "48656c6c");
encoded.Base16.set("Hello",             "48656c6c6f");
encoded.Base16.set("Hello ",            "48656c6c6f20");
encoded.Base16.set("Hello W",           "48656c6c6f2057");
encoded.Base16.set("Hello Wo",          "48656c6c6f20576f");
encoded.Base16.set("Hello Wor",         "48656c6c6f20576f72");
encoded.Base16.set("Hello Worl",        "48656c6c6f20576f726c");
encoded.Base16.set("Hello World",       "48656c6c6f20576f726c64");
encoded.Base16.set("Hello World!",      "48656c6c6f20576f726c6421");
encoded.Base16.set("Hello World!!",     "48656c6c6f20576f726c642121");
encoded.Base16.set("Hello World!!!",    "48656c6c6f20576f726c64212121");

// Base32 (rfc3548)
encoded.Base32 = new Map();
encoded.Base32.set("H",                 "JA======");
encoded.Base32.set("He",                "JBSQ====");
encoded.Base32.set("Hel",               "JBSWY===");
encoded.Base32.set("Hell",              "JBSWY3A=");
encoded.Base32.set("Hello",             "JBSWY3DP");
encoded.Base32.set("Hello ",            "JBSWY3DPEA======");
encoded.Base32.set("Hello W",           "JBSWY3DPEBLQ====");
encoded.Base32.set("Hello Wo",          "JBSWY3DPEBLW6===");
encoded.Base32.set("Hello Wor",         "JBSWY3DPEBLW64Q=");
encoded.Base32.set("Hello Worl",        "JBSWY3DPEBLW64TM");
encoded.Base32.set("Hello World",       "JBSWY3DPEBLW64TMMQ======");
encoded.Base32.set("Hello World!",      "JBSWY3DPEBLW64TMMQQQ====");
encoded.Base32.set("Hello World!!",     "JBSWY3DPEBLW64TMMQQSC===");
encoded.Base32.set("Hello World!!!",    "JBSWY3DPEBLW64TMMQQSCII=");

// Base64
encoded.Base64 = new Map();
encoded.Base64.set("H",                 "SA==");
encoded.Base64.set("He",                "SGU=");
encoded.Base64.set("Hel",               "SGVs");
encoded.Base64.set("Hell",              "SGVsbA==");
encoded.Base64.set("Hello",             "SGVsbG8=");
encoded.Base64.set("Hello ",            "SGVsbG8g");
encoded.Base64.set("Hello W",           "SGVsbG8gVw==");
encoded.Base64.set("Hello Wo",          "SGVsbG8gV28=");
encoded.Base64.set("Hello Wor",         "SGVsbG8gV29y");
encoded.Base64.set("Hello Worl",        "SGVsbG8gV29ybA==");
encoded.Base64.set("Hello World",       "SGVsbG8gV29ybGQ=");
encoded.Base64.set("Hello World!",      "SGVsbG8gV29ybGQh");
encoded.Base64.set("Hello World!!",     "SGVsbG8gV29ybGQhIQ==");
encoded.Base64.set("Hello World!!!",    "SGVsbG8gV29ybGQhISE=");

// Base85
encoded.Base85 = new Map();
encoded.Base85.set("H",                 "8,");
encoded.Base85.set("He",                "87_");
encoded.Base85.set("Hel",               "87cT");
encoded.Base85.set("Hell",              "87cUR");
encoded.Base85.set("Hello",             "87cURDZ");
encoded.Base85.set("Hello ",            "87cURD]f");
encoded.Base85.set("Hello W",           "87cURD]i*");
encoded.Base85.set("Hello Wo",          "87cURD]i,\"");
encoded.Base85.set("Hello Wor",         "87cURD]i,\"EW");
encoded.Base85.set("Hello Worl",        "87cURD]i,\"Ebk");
encoded.Base85.set("Hello World",       "87cURD]i,\"Ebo7");
encoded.Base85.set("Hello World!",      "87cURD]i,\"Ebo80");
encoded.Base85.set("Hello World!!",     "87cURD]i,\"Ebo80+T");
encoded.Base85.set("Hello World!!!",    "87cURD]i,\"Ebo80+X$");

// Base91
encoded.Base91 = new Map();
encoded.Base91.set("H",                 ".A");
encoded.Base91.set("He",                ">OD");
encoded.Base91.set("Hel",               ">OwJ");
encoded.Base91.set("Hell",              ">OwJb");
encoded.Base91.set("Hello",             ">OwJh>A");
encoded.Base91.set("Hello ",            ">OwJh>$A");
encoded.Base91.set("Hello W",           ">OwJh>IoF");
encoded.Base91.set("Hello Wo",          ">OwJh>Io0T");
encoded.Base91.set("Hello Wor",         ">OwJh>Io0T5");
encoded.Base91.set("Hello Worl",        ">OwJh>Io0Tv!B");
encoded.Base91.set("Hello World",       ">OwJh>Io0Tv!lE");
encoded.Base91.set("Hello World!",      ">OwJh>Io0Tv!8PE");
encoded.Base91.set("Hello World!!",     ">OwJh>Io0Tv!8P7L");
encoded.Base91.set("Hello World!!!",    ">OwJh>Io0Tv!8P7LhA");

