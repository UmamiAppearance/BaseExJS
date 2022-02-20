import { SimpleBase } from "../src/base-ex.js";

const Base10 = new SimpleBase(10);

function strToBaseX(input, encoder) {
    const endianness = (encoder.littleEndian) ? "LE" : "BE";
    const b10Integer = BigInt(Base10.encode(input, endianness));
    return b10Integer.toString(encoder.converter.radix);
}

function numberConversions() {

    const randInt = (max, min=0) => BigInt(Math.floor(Math.random() * (max - min) + min));
   
    for (let radix=2; radix<37; radix++) {
        
        const baseConverter = new SimpleBase(radix);

        const testRange = (input) => {
            //console.log("---------\n");

            const expected = input.toString(radix);
            //console.log("Input: ", input);
            //console.log("Expected: ", expected);

            const output = baseConverter.encode(input);
            //console.log("Output: ", output);

            const passedEnc = output === expected;
            let passedDec = false;
            if (passedEnc) {
                const backDecoded = baseConverter.decode(output, "number");
                //console.log("BackDec: ", backDecoded);

                passedDec = backDecoded === input;

            }

            //console.log("Passed: ", passedEnc, "/", "Passed: ", passedDec);
            if (!(passedEnc === true && passedDec === true)) {
                console.log("RADIX", radix);
                throw new Error("BUG!");
            }
            return [passedEnc, passedDec];
    
        }

        console.log("---------\nRADIX", radix);
     
        for (let i=8; i<=1024; i*=2) {

            const n = 2n**BigInt(i);

            for (const signMulti of [1n, -1n]) {

                for (const add of [-randInt(128, 2), -1n, 0n, 1n, randInt(128, 2)]) {

                    let nn = (n + add) * signMulti;
                    
                    if (nn <= Number.MAX_SAFE_INTEGER && nn >= Number.MIN_SAFE_INTEGER) {
                        nn = Number(nn);
                    } 
                    
                    testRange(nn);
                }
            
            }

        }


    const x = strToBaseX("Hello World!!!", baseConverter);
    const y = baseConverter.encode("Hello World!!!");      
    
    console.log("HW", x);
    console.log("HW", y);
    
    console.log(x === y);
    if (x !== y) throw new Error("BUG !!!");

    }

}


numberConversions();
