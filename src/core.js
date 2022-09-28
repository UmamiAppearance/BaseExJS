import { Utils } from "./utils.js";

/**
 * BaseEx Base Converter.
 * ---------------------
 * Core class for base-conversion and substitution
 * based on a given charset.
 */
class BaseConverter {

    /**
     * BaseEx BaseConverter Constructor.
     * @param {number} radix - Radix for the converter.
     * @param {number} [bsEnc] - Block Size (input bytes grouped by bs) for encoding (if zero the integer has no limitation).
     * @param {number} [bsDec] - Block Size (input bytes grouped by bs) for decoding (if zero the integer has no limitation).
     * @param {number} [decPadVal=0] - Value used for padding during decoding.
     */
    constructor(radix, bsEnc=null, bsDec=null, decPadVal=0) {
        
        this.radix = radix;

        if (bsEnc !== null && bsDec !== null) {
            this.bsEnc = bsEnc;
            this.bsDec = bsDec;
        } else {
            [this.bsEnc, this.bsDec] = this.constructor.guessBS(radix);
        }

        this.decPadVal = decPadVal;
    }

    /**
     * Experimental feature!
     * Calc how many bits are needed to represent
     * 256 conditions (1 byte). If the radix is 
     * less than 8 bits, skip that part and use
     * the radix value directly.
     */
    static guessBS(radix) {

        let bsDecPre = (radix < 8) ? radix : Math.ceil(256 / radix);
        
        // If the result is a multiple of 8 it
        // is appropriate to reduce the result

        while (bsDecPre > 8 && !(bsDecPre % 8)) {
            bsDecPre /= 8;
        }

        // Search for the amount of bytes, which are necessary
        // to represent the assumed amount of bytes. If the result
        // is equal or bigger than the assumption for decoding, the
        // amount of bytes for encoding is found. 

        let bsEnc = 0;
        while (((bsEnc * 8) * Math.log(2) / Math.log(radix)) < bsDecPre) {
            bsEnc++;
        }

        // The result for decoding can now get calculated accurately.
        const bsDec = Math.ceil((bsEnc * 8) * Math.log(2) / Math.log(radix));

        return [bsEnc, bsDec];
    }


    /**
     * BaseEx Universal Base Encoding.
     * @param {{ buffer: ArrayBufferLike; byteLength: any; byteOffset: any; length: any; BYTES_PER_ELEMENT: 1; }} inputBytes - Input as Uint8Array.
     * @param {string} charset - The charset used for conversion.
     * @param {boolean} littleEndian - Byte order, little endian bool.
     * @param {function} replacer - Replacer function can replace groups of characters during encoding.
     * @returns {number[]} - Output string and padding amount. 
     */
    encode(inputBytes, charset, littleEndian=false, replacer=null) {

        // Initialize output string and set yet unknown
        // zero padding to zero.
        let bs = this.bsEnc;
        if (bs === 0) {
            bs = inputBytes.byteLength;
        }

        let output = "";

        const zeroPadding = (bs) ? (bs - inputBytes.length % bs) % bs : 0;
        const zeroArray = new Array(zeroPadding).fill(0);
        let byteArray;
        
        if (littleEndian) {
            
            // as the following loop walks through the array
            // from left to right, the input bytes get reversed
            // to favor the least significant first

            inputBytes.reverse();
            byteArray = [...zeroArray, ...inputBytes];
        } else {
            byteArray = [...inputBytes, ...zeroArray];
        }
        
        // Iterate over the input array in groups with the length
        // of the given blocksize.

        // If the radix is 10, make a shortcut here by converting
        // all bytes into the decimal number "n" and return the
        // result as a string.
        if (this.radix === 10) {
            let n = 0n;
            
            for (let i=0; i<bs; i++) {
                n = (n << 8n) + BigInt(byteArray[i]);
            }
            return [n.toString(), 0];
        }
        
        // For any other radix, convert the subarray into a 
        // bs*8-bit binary number "n".
        // The blocksize defines the size of the corresponding
        // integer. Dependent on the blocksize this may lead  
        // to values, that are higher than the "MAX_SAFE_INTEGER",
        // therefore BigInts are used.
        for (let i=0, l=byteArray.length; i<l; i+=bs) {
  
            let n = 0n;
            
            for (let j=i; j<i+bs; j++) {
                n = (n << 8n) + BigInt(byteArray[j]);
            }

            // Initialize a new ordinary array, to
            // store the digits with the given radix  
            const bXarray = new Array();

            // Initialize quotient and remainder for base conversion
            let q = n, r;

            // Divide n until the quotient becomes less than the radix.
            while (q >= this.radix) {
                [q, r] = this.divmod(q, this.radix);
                bXarray.unshift(parseInt(r, 10));
            }

            // Append the remaining quotient to the array
            bXarray.unshift(parseInt(q, 10));

            // If the length of the array is less than the
            // given output bs, it gets filled up with zeros.
            // (This happens in groups of null bytes)
            
            while (bXarray.length < this.bsDec) {
                bXarray.unshift(0);
            }

            // Each digit is used as an index to pick a 
            // corresponding char from the charset. The 
            // chars get concatenated and stored in "frame".

            let frame = "";
            bXarray.forEach(
                charIndex => frame = frame.concat(charset[charIndex])
            );

            // Ascii85 is replacing four consecutive "!" into "z"
            // Also other replacements can be implemented and used
            // at this point.
            if (replacer) {
                frame = replacer(frame, zeroPadding);
            }

            output = output.concat(frame);
        }

        // The output string is returned. Also the amount 
        // of padded zeros. The specific class decides how 
        // to handle the padding.

        return [output, zeroPadding];
    }


    /**
     * BaseEx Universal Base Decoding.
     * Decodes to a string of the given radix to a byte array.
     * @param {string} inputBaseStr - Base as string (will also get converted to string but can only be used if valid after that).
     * @param {string[]} charset - The charset used for conversion.
     * @param {string[]} padSet - Padding characters for integrity check.
     * @param {boolean} integrity - If set to false invalid character will be ignored.
     * @param {boolean} littleEndian - Byte order, little endian bool.
     * @returns {{ buffer: ArrayBufferLike; byteLength: any; byteOffset: any; length: any; BYTES_PER_ELEMENT: 1; }} - The decoded output as Uint8Array.
     */
    decode(inputBaseStr, charset, padSet=[], integrity=true, littleEndian=false) {

        // Convert each char of the input to the radix-integer
        // (this becomes the corresponding index of the char
        // from the charset). Every char, that is not found in
        // in the set is getting ignored.

        if (!inputBaseStr) {
            return new Uint8Array(0);
        }

    
        let bs = this.bsDec;
        const byteArray = new Array();

        [...inputBaseStr].forEach(c => {
            const index = charset.indexOf(c);
            if (index > -1) { 
                byteArray.push(index);
            } else if (integrity && padSet.indexOf(c) === -1) {
                throw new TypeError(`Invalid input. Character: '${c}' is not part of the charset.`)
            }
        });
        
        let padChars;

        if (bs === 0) {
            bs = byteArray.length;
        } else {
            padChars = (bs - byteArray.length % bs) % bs;
            const fillArray = new Array(padChars).fill(this.decPadVal);
            if (littleEndian) {
                byteArray.unshift(...fillArray);
            } else {
                byteArray.push(...fillArray);
            }
        }

        // Initialize a new default array to store
        // the converted radix-256 integers.

        let b256Array = new Array();

        // Iterate over the input bytes in groups of 
        // the blocksize.

        for (let i=0, l=byteArray.length; i<l; i+=bs) {
            
            // Build a subarray of bs bytes.
            let n = 0n;

            for (let j=0; j<bs; j++) {
                n += BigInt(byteArray[i+j]) * this.pow(bs-1-j);
            }
            
            // To store the output chunks, initialize a
            // new default array.
            const subArray256 = new Array();

            // The subarray gets converted into a bs*8-bit 
            // binary number "n", most significant byte 
            // first (big endian).

            // Initialize quotient and remainder for base conversion
            let q = n, r;

            // Divide n until the quotient is less than 256.
            while (q >= 256) {
                [q, r] = this.divmod(q, 256);
                subArray256.unshift(parseInt(r, 10));
            }

            // Append the remaining quotient to the array
            subArray256.unshift(parseInt(q, 10));
            
            // If the length of the array is less than the required
            // bs after decoding it gets filled up with zeros.
            // (Again, this happens with null bytes.)

            while (subArray256.length < this.bsEnc) {
                subArray256.unshift(0);
            }
            
            // The subarray gets concatenated with the
            // main array.
            b256Array = b256Array.concat(subArray256);
        }

        // Remove padded zeros (or in case of LE all leading zeros)

        if (littleEndian) {
            if (b256Array.length > 1) {
            
                // remove all zeros from the start of the array
                while (!b256Array[0]) {
                    b256Array.shift();  
                }
                
                if (!b256Array.length) {
                    b256Array.push(0);
                }

                b256Array.reverse();
            }
        } else if (this.bsDec) {
            const padding = this.padChars(padChars);

            // remove all bytes according to the padding
            b256Array.splice(b256Array.length-padding);
        }

        return Uint8Array.from(b256Array);
    }


    /**
     * Calculates the amount of bytes, which are padding bytes. 
     * @param {number} charCount - Pass the amount of characters, which were added during encoding. 
     * @returns {number} - Amount of padding characters.
     */
    padBytes(charCount) {
        return Math.floor((charCount * this.bsDec) / this.bsEnc);
    }

    /**
     * Calculates the amount of bytes which can get removed
     * from the decoded output bytes. 
     * @param {number} byteCount - Added bytes for padding 
     * @returns {number} - Amount of output bytes to be removed.
     */
    padChars(byteCount) {
        return Math.ceil((byteCount * this.bsEnc) / this.bsDec);
    }


    /**
     * Calculates the power for the current base
     * according to the given position as BigInt.
     * 
     * @param {number} n - Position 
     * @returns {BigInt} - BigInt power value
     */
    pow(n) {
        return BigInt(this.radix)**BigInt(n);
    }


    /**
     * Divmod function, which returns the results as
     * an array of two BigInts.
     * @param {*} x - Dividend
     * @param {*} y - Divisor
     * @returns {number[]} - [Quotient, Remainder]
     */
    divmod(x, y) {
        [x, y] = [BigInt(x), BigInt(y)];
        return [(x / y), (x % y)];
    }
}


/**
 * Base of every BaseConverter. Provides basic
 * en- and decoding, makes sure, that every 
 * property is set (to false by default).
 * Also allows global feature additions.
 * 
 * Requires BaseEx Utils
 */
class BaseTemplate {

    /**
     * BaseEx BaseTemplate Constructor.
     * @param {boolean} appendUtils - If set to false, the utils are not getting used. 
     */
    constructor(appendUtils=true) {

        // predefined settings
        this.charsets = {};
        this.hasSignedMode = false;
        this.integrity = true;
        this.littleEndian = false;
        this.numberMode = false;
        this.outputType = "buffer";
        this.padding = false;
        this.padChars = {
            default: ""
        } 
        this.signed = false;
        this.upper = null;
        if (appendUtils) this.utils = new Utils(this);
        this.version = "default";
        
        // list of allowed/disallowed args to change
        this.isMutable = {
            integrity: true,
            littleEndian: false,
            padding: false,
            signed: false,
            upper: false,
        };
    }

    /**
     * BaseEx Generic Encoder.
     * @param {*} input - Any input the used byte converter allows.
     * @param {function} [replacerFN] - Replacer function, which is passed to the encoder. 
     * @param {function} [postEncodeFN] - Function, which is executed after encoding.
     * @param  {...any} args - Converter settings.
     * @returns {string} - Base encoded string.
     */
    encode(input, replacerFN, postEncodeFN, ...args) {

        // apply settings
        const settings = this.utils.validateArgs(args);
        
        // handle input
        let inputBytes, negative, type;
        [inputBytes, negative, type] = this.utils.inputHandler.toBytes(input, settings);

        // generate replacer function if given
        let replacer = null;
        if (replacerFN) {
            replacer = replacerFN(settings);
        }
        
        // Convert to base string
        let [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[settings.version], settings.littleEndian, replacer);

        // set sign if requested
        if (settings.signed) {
            output = this.utils.toSignedStr(output, negative);
        }

        // set upper case if requested
        if (settings.upper) {
            output = output.toUpperCase();
        }

        // modify the output based on a given function (optionally)
        if (postEncodeFN) {
            output = postEncodeFN({ inputBytes, output, settings, zeroPadding, type });
        }

        return output;
    }


    /**
     * BaseEx Generic Decoder.
     * @param {string} input - Base String.
     * @param {function} [preDecodeFN] - Function, which gets executed before decoding. 
     * @param {function} [postDecodeFN] - Function, which gets executed after decoding
     * @param  {...any} args - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, preDecodeFN, postDecodeFN, ...args) {
    
        // apply settings
        const settings = this.utils.validateArgs(args);

        // ensure a string input
        input = String(input);

        // set negative to false for starters
        let negative = false;
        
        // Test for a negative sign if converter supports it
        if (this.hasSignedMode) {
            [ input, negative ] = this.utils.extractSign(input);   
            
            // But don't allow a sign if the decoder is not configured to use it
            if (negative && !settings.signed) {
                this.utils.signError();
            }
        }

        // Make the input lower case if alphabet has only one case
        // (single case alphabets are stored as lower case strings)
        if (this.isMutable.upper) {
            input = input.toLowerCase();
        }

        // Run pre decode function if provided
        if (preDecodeFN) {
            input = preDecodeFN({ input, settings });
        }

        // Run the decoder
        let output = this.converter.decode(
            input,
            this.charsets[settings.version],
            this.padChars[settings.version],
            settings.integrity,
            settings.littleEndian
        );

        // Run post decode function if provided
        if (postDecodeFN) {
            output = postDecodeFN({ input, output, settings });
        }

        return this.utils.outputHandler.compile(output, settings.outputType, settings.littleEndian, negative);
    }
}


export { BaseConverter, BaseTemplate };
