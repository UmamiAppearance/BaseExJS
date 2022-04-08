import { SimpleBase } from "../src/base-ex.js";

function simpleBaseTests() {

    const Base10 = new SimpleBase(10);
    const randInt = (max, min=0) => BigInt(Math.floor(Math.random() * (max - min) + min));
    const strToBase = (input, encoder) => {
        const endianness = (encoder.littleEndian) ? "LE" : "BE";
        const b10Integer = BigInt(Base10.encode(input, endianness));
        return b10Integer.toString(encoder.converter.radix);
    };

    for (let radix=2; radix<=36; radix++) {
        
        const baseConverter = new SimpleBase(radix);

        console.log("---------\nRADIX", radix);
     
        for (let i=8; i<=1024; i*=2) {

            const n = 2n**BigInt(i);

            for (const signMulti of [1n, -1n]) {

                for (const add of [-randInt(128, 2), -1n, 0n, 1n, randInt(128, 2)]) {

                    let nn = (n + add) * signMulti;
                    
                    if (nn <= Number.MAX_SAFE_INTEGER && nn >= Number.MIN_SAFE_INTEGER) {
                        nn = Number(nn);
                    } 
                    
                    const expected = nn.toString(radix);
                    //console.log("Input: ", nn);
                    //console.log("Expected: ", expected);

                    const output = baseConverter.encode(nn);
                    //console.log("Output: ", output);

                    const passedEnc = output === expected;
                    let passedDec = false;
                    if (passedEnc) {
                        const backDecoded = baseConverter.decode(output, "uint_n");
                        console.log("Expectred", nn);
                        console.log("BackDec: ", backDecoded);

                        passedDec = backDecoded === nn;

                    }

                    console.log("Passed: ", passedEnc, "/", "Passed: ", passedDec);
                    if (!(passedEnc === true && passedDec === true)) {
                        console.log("RADIX", radix);
                        throw new Error("BUG!");
                    }
                    console.log([passedEnc, passedDec]);
                }
            
            }

        }

        let helloInput = "";
        "Hello World!!!".split("").forEach(c => {
            helloInput += c;
            const expected = strToBase(helloInput, baseConverter);
            const output = baseConverter.encode(helloInput);

            const passedEnc = output === expected;
            let passedDec = false;
            
            if (passedEnc) {
                const backDecoded = baseConverter.decode(output, "str");
                console.log("BackDec: ", backDecoded);

                passedDec = backDecoded === helloInput;

            }

            console.log([passedEnc, passedDec]);

        });
    }

}

simpleBaseTests();
