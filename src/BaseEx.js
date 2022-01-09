/*
 * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
 *
 * @version 0.3.2
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0 AND BSD-3-Clause (Base91, Copyright (c) 2000-2006 Joachim Henke)
 */

function getBits(x) {
    return Math.log(x) / Math.log(2);
}


class Base16 {
    /*
        En-/decoding to and from base16 (hexadecimal).
        For integers two's complement system is getting used.
        (Requires "BaseExConv", "BaseExUtils")
    */

    constructor(version="default", input="str", output="str") {
        this.charsets = {
            default: "0123456789abcdef" 
        }

        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);

        this.converter = new BaseExConv(16, 1, 2);
        this.converter.padAmount = [0]
    }

    encode(input, ...args) {
        /* 
            Hex string encoder from string or bytes.
            --------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
        */
        
        // argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

        // convert to an array of bytes if necessary
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        
        // Convert to Base16 string
        const output = this.converter.encode(inputBytes, this.charsets[version])[0];

        return output;
    }

    decode(input, ...args) {
        /*
            Hex string decoder.
            ------------------

            @input: hex-string
            @args:
                "str"       :  tells the encoder, that output should be a utf8-string (default)
                "bytes"     :  tells the encoder, that output should be an array of bytes
        */
        
        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");
        
        // Remove the leading 0x if present
        input = String(input).replace(/^0x/, '');

        // Make it lower case
        input = input.toLowerCase();
        
        // Ensure even number of characters
        if (input.length % 2) {
            input = "0".concat(input);
        }
        
        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);
        
        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }
}


class Base32 {
    /*
        En-/decoding to and from Base32.
        -------------------------------

        Uses RFC standard 4658 by default (as used e.g
        for (t)otp keys), RFC 3548 is also supported.
        
        (Requires "BaseExConv", "BaseExUtils")
    */
    
    constructor(version="rfc4648", input="str", output="str", padding=true) {
        /*
            The RFC standard defined here is used by de- and encoder.
            This can be overwritten during the call of the function.
        */

        this.charsets = {
            rfc3548:"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
            rfc4648:   "0123456789ABCDEFGHIJKLMNOPQRSTUV",
            crockford: "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
        }

        this.padding = Boolean(padding);
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);

        this.converter = new BaseExConv(32, 5, 8);
        this.converter.padAmount = [0, 1, 3, 4, 6]; // -> ["", "=", "===", "====", "======"]
    }
    
    encode(input, ...args) {
        /* 
            Encode from string or bytes to base32.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "rfc3548"   :  sets the used charset to this standard
                "rfc4648"   :  sets the used charset to this standard
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

        // Convert to bytes if input is a string
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        
        // Convert to Base32 string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[version]);
        
        // Cut of redundant chars and append padding if set
        if (zeroPadding) {
            const padValue = this.converter.padAmount[zeroPadding];
            output = output.slice(0, output.length-padValue);
            if (this.padding) { 
                output = output.concat("=".repeat(padValue));
            }
        }

        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base32 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base32-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "bytes"     :  tells the encoder, that output should be an array
                "rfc3548"   :  defines to use the charset of this version
                "rfc4648"   :  defines to use the charset of this version (default)
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");

        // Make it upper case
        input = input.toUpperCase();

        // If the input is unpadded, pad it.
        const missingChars = input.length % 8;
        if (missingChars) {
            input = input.padEnd(input.length + 8-missingChars, "=");
        }

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);
        
        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }
}


class Base64 {
    /*
        En-/decoding to and from Base64.
        -------------------------------
        
        Regular and urlsafe charsets can be used.
        (Requires "BaseExConv", "BaseExUtils")
    */

    constructor(version="default", input="str", output="str", padding=true) {
        /*
            The charset defined here is used by de- and encoder.
            This can be overwritten during the call of the function.
        */

        const b62Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        this.charsets = {
            default: b62Chars.concat("+/"),
            urlsafe: b62Chars.concat("-_")
        }

        this.padding = Boolean(padding);
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);

        this.converter = new BaseExConv(64, 3, 4);
        this.converter.padAmount = [0, 1, 2]; // ["", "=", "=="]
    }

    encode(input, ...args) {
        /*
            Encode from string or bytes to base64.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "default"   :  sets the used charset to this variant (default)
                "urlsafe"   :  sets the used charset to this variant
        */
       
        // Argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

        // Convert to bytes if input is a string
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;
        
        // Convert to Base64 string
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[version]);
        
        // Cut of redundant chars and append padding if set
        if (zeroPadding) {
            const padValue = this.converter.padAmount[zeroPadding];
            output = output.slice(0, output.length-padValue);
            if (this.padding) { 
                output = output.concat("=".repeat(padValue));
            }
        }
    
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base64 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base32-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "bytes"     :  tells the encoder, that output should be an array
                "default"   :  sets the used charset to this variant (default)
                "urlsafe"   :  sets the used charset to this variant
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");
 
        // If the input is unpadded, pad it.
        const missingChars = input.length % 4;
        if (missingChars) {
            input = input.padEnd(input.length + 4-missingChars, "=");
        }

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);

        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }
}


class Base85 {
    /*
        En-/decoding to and from Base85.
        -------------------------------

        Four versions are supported: 
          
            * adobe
            * ascii85
            * rfc1924
            * z85
        
        Adobe and ascii85 are the basically the same.
        Adobe will produce the same output, apart from
        the <~wrapping~>.
        
        Z85 is an important variant, because of the 
        more interpreter-friendly character set.
        
        The RFC 1924 version is a hybrid. It is not using
        the mandatory 128 bit calculation. Instead only 
        the charset is used. Do not use this for any real
        project. (Keep in mind, that even the original is
        based on a joke).

        (Requires "BaseExConv", "BaseExUtils")
        
    */

    constructor(version="ascii85", input="str", output="str", debug=false) {
        /*
            The charset defined here is used by de- and encoder.
            This can still be overwritten during the call of the
            function.
        */

        const asciiChars = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
        this.charsets = {
            ascii85: asciiChars,
            adobe: asciiChars,
            rfc1924: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~",
            z85: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#",
        }
        
        this.IOtypes = ["str", "bytes"];
        this.utils = new BaseExUtils(this);
        this.expandUtils(debug);
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);

        this.converter = new BaseExConv(85, 4, 5);
        this.converter.padAmount = [0]; // Padding gets cut of completely
    }
    
    encode(input, ...args) {
        /* 
            Encode from string or bytes to base85.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "adobe"     :  sets charset to ascii85 + <~frame~> 
                "ascii85"   :  sets charset to this commonly used one
                "rfc1924"   :  uses the charset (and only the charset) of this april fool
                "z85"       :  sets the used charset to this variant
        */
       
        // Argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

        // Convert to bytes if input is a string
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;

        // Initialize the replacing of null bytes for ascii85
        let replacer = null;
        if (version.match(/adobe|ascii85/)) {
            replacer = (frame, zPad) => (!zPad && frame === "!!!!!") ? "z" : frame;
        }

        // Convert to Base85 string        
        let output, zeroPadding;
        [output, zeroPadding] = this.converter.encode(inputBytes, this.charsets[version], replacer);
        output = output.slice(0, output.length-zeroPadding);
    
        // Adobes variant gets its <~framing~>
        if (version === "adobe") {
            output = `<~${output}~>`;
        }
        
        // ...
        if (version === "rfc1924") this.utils.announce();
        
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base85 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base85-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "bytes"     :  tells the encoder, that output should be an array
                "adobe"     :  sets charset to ascii85 + <~frame~> 
                "ascii85"   :  sets charset to this commonly used one
                "rfc1924"   :  uses the charset (and only the charset) of this april fool
                "z85"       :  sets the used charset to this variant
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");
        input = input.replace(/\s/g,'');        //remove all whitespace from input
        
        // For default ascii85 convert "z" back to "!!!!!"
        if (version.match(/adobe|ascii85/)) {
            input = input.replace(/z/g, "!!!!!");
            if (version === "adobe") {
                input = input.replace(/^<~|~>$/g, "");
            }
        }

        // Run the decoder
        const output = this.converter.decode(input, this.charsets[version]);

        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }
    }

    expandUtils(debug) {        
        this.utils.announce = () => {
            if (!debug) {
                const date = new Date();
                if (date.getMonth() === 3 && date.getDate() === 1) {
                    // eslint-disable-next-line no-useless-escape
                    console.log("         __\n _(\\    |@@|\n(__/\\__ \\--/ __\n   \\___|----|  |   __\n       \\ }{ /\\ )_ / _\\\n       /\\__/\\ \\__O (__\n      (--/\--)    \\__/\n      _)(  )(_\n     `---''---`");
                } else {
                    const ts = date.getTime();
                    date.setMonth(3, 1);
                    date.setHours(0, 0, 0);
                    if (date.getTime() < ts) date.setFullYear(date.getFullYear()+1);
                    const dist = date - ts;
                    const d = Math.floor(dist / 86400000);
                    const H = Math.floor((dist % 86400000) / 3600000);
                    const M = Math.floor((dist % 3600000) / 60000);
                    const msg = `Time left: ${d} days, ${H} hours, ${M} minutes`;
                    BaseExUtils.warning("Only the charset is used. The input is not taken as a 128 bit integer. (because this is madness)");
                    BaseExUtils.warning(msg);
                }
            }
        }
    }
}


class Base91 {
    /*
        En-/decoding to and from Base91.
        -------------------------------
        
        This is an implementation of Joachim Henkes method to
        encode binary data as ASCII characters -> basE91
        http://base91.sourceforge.net/

        As this method requires to split the bytes, the default
        conversion class "BaseExConv" is not used in this case.
        (Requires "BaseExUtils")
    */
    constructor(version="default", input="str", output="str") {
        /*
            The default charset gets initialized, as well as
            some utilities.
        */
        this.charsets = {
            default: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\""
        }
        
        this.IOtypes = ["str", "bytes"];

        this.utils = new BaseExUtils(this);
        this.utils.divmod = (x, y) => [Math.floor(x / y), x % y];
        
        [this.version, this.defaultInput, this.defaultOutput] = this.utils.validateArgs([version, input, output]);
    }

    encode(input, ...args) {
        /* 
            Encode from string or bytes to base92.
            -------------------------------------

            @input: string or (typed) array of bytes
            @args:
                "str"       :  tells the encoder, that input is a string (default)
                "bytes"     :  tells the encoder, that input is an array
                "default"   :  default charset 
        */
       
        // Argument validation and input settings
        args = this.utils.validateArgs(args);
        const inputType = this.utils.setIOType(args, "in");
        const version = this.utils.getVersion(args);
        input = this.utils.validateInput(input, inputType);

        // Convert to bytes if input is a string
        const inputBytes = (inputType === "str") ? new TextEncoder().encode(input) : input;

        // As this base representation splits the bytes
        // the read bits need to be stores somewhere. 
        // This is done in "bitCount". "n", similar to 
        // other solutions here, holds the integer which
        // is converted to the desired base.

        let bitCount = 0;
        let n = 0;
        let output = "";

        // Shortcut
        const chars = this.charsets[version];

        inputBytes.forEach(byte => {
            //n = n + byte * 2^bitcount;
            n += (byte << bitCount);

            // Add 8 bits forEach byte
            bitCount += 8;
            
            // If the count exceeds 13 bits, base convert the
            // current frame.

            if (bitCount > 13) {

                // Set bit amount "count" to 13, check the
                // remainder of n % 2^13. If it is 88 or 
                // lower. Take one more bit from the stream
                // and calculate the remainder for n % 2^14.

                let count = 13;
                let rN = n % 8192;

                if (rN < 89) {
                    count = 14;
                    rN = n % 16384;
                }

                // Remove 13 or 14 bits from the integer,
                // decrease the bitCount by the same amount.
                n >>= count;
                bitCount -= count;
                
                // Calculate quotient and remainder from
                // the before calculated remainder of n 
                // -> "rN"
                let q, r;
                [q, r] = this.utils.divmod(rN, 91);

                // Lookup the corresponding characters for
                // "r" and "q" in the set, append it to the 
                // output string.
                output = `${output}${chars[r]}${chars[q]}`;
            }
        });
        
        // If the bitCount is not zero at the end,
        // calculate quotient and remainder of 91
        // once more.
        if (bitCount) {
            let q, r;
            [q, r] = this.utils.divmod(n, 91);

            // The remainder is concatenated in any case
            output = output.concat(chars[r]);

            // The quotient is also appended, but only
            // if the bitCount still has the size of a byte
            // or n can still represent 91 conditions.
            if (bitCount > 7 || n > 90) {
                output = output.concat(chars[q]);
            }
        }
        
        return output;
    }

    decode(input, ...args) {
        /* 
            Decode from base91 string to utf8-string or bytes.
            -------------------------------------------------

            @input: base91-string
            @args:
                "str"       :  tells the encoder, that output should be a string (default)
                "bytes"     :  tells the encoder, that output should be an array
                "default"   :  sets the used charset to this variant
        */

        // Argument validation and output settings
        args = this.utils.validateArgs(args);
        const version = this.utils.getVersion(args);
        const outputType = this.utils.setIOType(args, "out");
        
        //remove all whitespace from input
        input = input.replace(/\s/g,'');
        
        let l = input.length;

        // For starters leave the last char behind
        // if the length of the input string is odd.

        let odd = false;
        if (l % 2) {
            odd = true;
            l--;
        }

        // Set again integer n for base conversion.
        // Also initialize a bitCount(er)

        let n = 0;
        let bitCount = 0;
        const chars = this.charsets[version];
        
        // Initialize an ordinary array
        const b256Array = new Array();
        
        // Walk through the string in steps of two
        // (aka collect remainder- and quotient-pairs)
        for (let i=0; i<l; i+=2) {

            // Calculate back the remainder of the integer "n"
            const rN = chars.indexOf(input[i]) + chars.indexOf(input[i+1]) * 91;
            n = (rN << bitCount) + n;
            bitCount += (rN % 8192 > 88) ? 13 : 14;

            // calculate back the individual bytes (base256)
            do {
                b256Array.push(n % 256);
                n >>= 8;
                bitCount -= 8;
            } while (bitCount > 7);
        }

        // Calculate the last byte if the input is odd
        // and add it
        if (odd) {
            const lastChar = input.charAt(l);
            const rN = chars.indexOf(lastChar);
            b256Array.push(((rN << bitCount) + n) % 256);
        }

        const output = Uint8Array.from(b256Array);

        // Return the output, convert to utf8-string if requested
        if (outputType === "bytes") {
            return output;
        } else {
            return new TextDecoder().decode(output);
        }

    }
}


class BaseExConv {
    /*
        Core class for base-conversion and substitution
        based on a given charset.
    */

    constructor(radix) {
        /*
            Stores the radix and blocksize for en-/decoding.
        */
        this.radix = radix;
        /*
        this.bsEnc = bsEnc;
        this.bsDec = bsDec;
        */
       this.calcBS(radix);
       console.log(radix, this.bsEnc, this.bsDec);

        // precalculate powers for decoding
        // [radix**bs-1, radix**i, ... radix**0]
        // bit shifting (as used during encoding)
        // only works on regular base conversions,
        // not something like base85
        
        this.powers = [];
        for (let i=0; i<this.bsDec; i++) {
            this.powers.unshift(BigInt(radix**i));
        }
    }

    calcBS(radix) {
        // Calc how many bits are needed to represent 256 conditions
        let bsDecPre = Math.ceil(256 / radix);
        
        // If the result is divisible by 8, divide by 8
        // (the result is a multiple of 8 in that case
        // therefore it is appropriate to reduce the result)

        if (bsDecPre > 8 && !(bsDecPre % 8)) {
            bsDecPre /= 8;
        }

        // Search for the amount of bytes, which are necessary
        // to represent the assumed amount of bytes. If the result
        // is equal or bigger than the assumption for decoding, the
        // amount of bytes for encoding is found. 

        let byteCount = 0;
        while (((byteCount * 8) * Math.log(2) / Math.log(radix)) < bsDecPre) {
            byteCount++;
        }
        this.bsEnc = byteCount;

        // The result for decoding can now get calculated accurately.
        this.bsDec = Math.ceil((byteCount * 8) * Math.log(2) / Math.log(radix));
    }

    encode(inputBytes, charset, replacer=null) {
        /*
            Encodes to the given radix from a byte array
        */

        // Initialize output string and set yet unknown
        // zero padding to zero.
        let output = "";
        let zeroPadding = 0;
        const bs = this.bsEnc;
        
        // Iterate over the input array in groups with the length
        // of the given blocksize.

        for (let i=0, l=inputBytes.length; i<l; i+=bs) {
            
            // Build a subarray of bs bytes
            let subArray = inputBytes.slice(i, i+bs);

            // At the very last block of bytes, there 
            // is a change that the subarray has a length
            // less than bs. If this is the case, padding is
            // required. All missing bytes are filled with
            // zeros. The amount of zeros is stored in
            // "zeroPadding".

            if (subArray.length < bs) {
                zeroPadding = bs - subArray.length;
                const paddedArray = new Uint8Array(bs);
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            // Convert the subarray into a bs*8-bit binary 
            // number "n", most significant byte first (big endian).
            // The blocksize defines the size of the corresponding
            // integer. According to the blocksize this may lead  
            // to values, that are higher than the "MAX_SAFE_INTEGER",
            // therefore BigInts are used.

 
            let n = 0n;
            subArray.forEach((b) => n = (n << 8n) + BigInt(b));

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

    decode(inputBaseStr, charset) {
        /*
            Decodes to a string of the given radix to a byte array
        */
        
        // Convert each char of the input to the radix-integer
        // (this becomes the corresponding index of the char
        // from the charset). Every char, that is not found in
        // in the set is assumed to be a padding char. The integer
        // is set to zero in this case.

        const bs = this.bsDec;
        let padChars = 0;

        const inputBytes = Uint8Array.from(
            inputBaseStr.split('').map(c => {
                const index = charset.indexOf(c);
                if (index < 0) { 
                    padChars++;
                    return 0;
                } else {
                    return index;
                }
            })
        );
        
        // The amount of padding characters is not equal
        // to the amount of padded zeros. This the
        // defined by the specific class and gets
        // converted.

        let padding = this.padAmount.indexOf(padChars);

        // Initialize a new default array to store
        // the converted radix-256 integers.

        let b256Array = new Array();

        // Iterate over the input bytes in groups of 
        // the blocksize.

        for (let i=0, l=inputBaseStr.length; i<l; i+=bs) {
            
            // Build a subarray of bs bytes.
            let subArray = inputBytes.slice(i, i+bs);

            // Ascii85 is cutting of the padding in any case. 
            // It is possible for this group of algorithms, that
            // the last subarray has a length which is less than
            // the bs. This is padded with the highest possible
            // value, which is radix-1 (=> 84 or char "u").
            // The amount of padding is stored in "padding".
            
            if (subArray.length < bs) {
                padding = bs - subArray.length;
                const paddedArray = Uint8Array.from(Array(bs).fill(this.radix-1));
                paddedArray.set(subArray);
                subArray = paddedArray;
            }
            
            // To store the output chunks, initialize a
            // new default array.
            const subArray256 = new Array();

            // The subarray gets converted into a bs*8-bit 
            // binary number "n", most significant byte 
            // first (big endian).

            let n = 0n;
            subArray.forEach(
                (b, j) => n += BigInt(b) * this.powers[j]
            );

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

        // Convert default array to typed uInt8 array.
        // The amount of bytes added for padding is left 
        // behind.

        const output = Uint8Array.from(b256Array.slice(0, b256Array.length-padding));
        
        return output;
    }

    divmod(x, y) {
        [x, y] = [BigInt(x), BigInt(y)];
        return [parseInt(x/y, 10), parseInt(x%y, 10)];
    }
}


class BaseExUtils {
    /*
        Utilities for every BaseEx class.
        The main purpose is argument validation.
    */

    constructor(main) {

        // Store the calling class in this.root
        // for accessability.
        this.root = main;

        // If charsets are uses by the parent class,
        // add extra functions for the user.
        if ("charsets" in main) this.charsetUserToolsConstructor();
    }

    charsetUserToolsConstructor() {
        /*
            Constructor for the ability to add a charset and 
            change the default version.
        */

        this.root.addCharset = (name, charset) => {
            /*
                Save method to add a charset.
                ----------------------------

                @name: string that represents the key for the new charset
                @charset: string, array or Set of chars - the length must fit to the according class 
            */
                
            if (typeof name !== "string") {
                throw new TypeError("The charset name must be a string.");
            }

            // Get the appropriate length for the charset
            // from the according converter
            
            const setLen = this.root.converter.radix;
            let inputLen = setLen;
            
            if (typeof charset === "string" || Array.isArray(charset)) {
                
                // Store the input length of the input
                inputLen = charset.length;
                
                // Convert to "Set" -> eliminate duplicates
                // If duplicates are found the length of the
                // Set and the length of the initial input
                // differ.

                charset = new Set(charset);

            } else if (!(charset instanceof Set)) {
                throw new TypeError("The charset must be one of the types:\n'str', 'set', 'array'.");
            }
            
            if (charset.size === setLen) {
                charset = [...charset].join("");
                this.root.charsets[name] = charset;
                console.log(`New charset added with the name '${name}' added and ready to use`);
            } else if (inputLen === setLen) {
                throw new Error("There were repetitive chars found in your charset. Make sure each char is unique.");
            } else {
                throw new Error(`The the length of the charset must be ${setLen}.`);
            }
        }

        // Save method (argument gets validated) to 
        // change the default version.
        this.root.setDefaultVersion = (version) => [this.root.version] = this.validateArgs([version]);
    }

    makeArgList(args) {
        /*
            Returns argument lists for error messages.
        */
        return args.map(s => `'${s}'`).join(", ");
    }

    setIOType(args, IO) {
        /* 
            Set type for input or output (bytes or string).
        */
        let type;
        if (args.includes("bytes")) {
            type = "bytes";
        } else if (args.includes("str")) { 
            type = "str";
        } else {
            type = (IO === "in") ? this.root.defaultInput : this.root.defaultOutput;
        }

        return type;
    }

    getVersion(args) {
        /*
            Test which version (charset) should be used.
            Sets either the default or overwrites it if
            requested.
        */
        let version = this.root.version;
        args.forEach(arg => {
            if (arg in this.root.charsets) {
                version = arg; 
            }
        })
        return version;
    }

    validateArgs(args) {
        /* 
            Test if provided arguments are in the argument list.
            Everything gets converted to lowercase and returned
        */
        let versions = null;
        let validArgs;
        const loweredArgs = new Array();

        if ("charsets" in this.root) {
            versions = Object.keys(this.root.charsets);
            validArgs = [...this.root.IOtypes, ...versions];
        } else {
            validArgs = this.root.IOtypes;
        }

        if (args.length) {
            args.forEach(arg => {
                arg = String(arg).toLowerCase();
                if (!validArgs.includes(arg)) {
                    const versionHint = (versions) ? `The options for version (charset) are:\n${this.makeArgList(versions)}\n\n` : "";
                    throw new TypeError(`'${arg}'\n\nValid arguments for in- and output-type are:\n${this.makeArgList(this.root.IOtypes)}\n\n${versionHint}Traceback:`);
                }
                loweredArgs.push(arg);
            });
        }
        return loweredArgs;
    }

    validateInput(input, inputType) {
        /* 
            Test if input type fits to the actual input.
        */
        if (inputType === "str") {
            if (typeof input !== "string") {
                this.constructor.warning("Your input was converted into a string.");
            }
            return String(input);
        } else {
            if (typeof input === "string") {
                throw new TypeError("Your provided input is a string, but some kind of (typed) Array is expected.");
            } else if (!(ArrayBuffer.isView(input) || Array.isArray(input))) {
                throw new TypeError("Input must be some kind of (typed) Array if input type is set to 'bytes'.");
            }
            return input; 
        }
    }

    static warning(message) {
        if (Object.prototype.hasOwnProperty.call(console, "warn")) {
            console.warn(message);
        } else {
            console.log(`___\n${message}\n`);
        }
    }
}


class SmartInput {

    makeDataView(byteLen) {
        const buffer = new ArrayBuffer(byteLen);
        return new DataView(buffer);
    }

    floatingPoints(input) {
        
        let view;
        
        // 32 Bit
        if (input > 1.2e-38 && input < 3.4e+38) {
            view = this.makeDataView(4);
            view.setFloat32(0, input, false);
        }

        // 64 Bit
        else if (input > 2.3e-308 && input < 1.7e+308) {
            view = this.makeDataView(8);
            view.setFloat64(0, input, false);
        }

        else {
            throw new RangeError("Float is too complex to handle. Convert it to bytes manually before encoding.");
        }

        return view;
    }

    numbers(input) {

        let view;

        // Integer
        if (Number.isInteger(input)) {

            if (!Number.isSafeInteger(input)) {
                
                let safeInt;
                let smallerOrBigger;
                let minMax;

                if (input < 0) {
                    safeInt = Number.MIN_SAFE_INTEGER;
                    smallerOrBigger = "smaller";
                    minMax = "MIN";
                } else {
                    safeInt = Number.MAX_SAFE_INTEGER;
                    smallerOrBigger = "bigger";
                    minMax = "MAX";
                }

                BaseExUtils.warning(`The provided integer is ${smallerOrBigger} than ${minMax}_SAFE_INTEGER: '${safeInt}'\nData loss is possible. Use a BigInt to avoid this issue.`);
            }

            // Signed Integer
            if (input < 0) {
                
                // 64 bit
                if (input < -2147483648) {
                    view = this.makeDataView(8);
                    view.setBigInt64(0, BigInt(input), false);
                }
                
                // 32 bit
                else if (input < -32768) {
                    view = this.makeDataView(4);
                    view.setInt32(0, input, false);
                }

                // 16 bit
                else {
                    view = this.makeDataView(2);
                    view.setInt16(0, input, false);
                }
            }

            // Unsigned Integer
            else if (input > 0) {

                // 64 bit
                if (input > 4294967295) {
                    view = this.makeDataView(8);
                    view.setBigUint64(0, BigInt(input), false);
                }
                
                // 32 bit
                else if (input > 65535) {
                    view = this.makeDataView(4);
                    view.setUint32(0, input, false);
                }
                
                // 16 bit
                else {
                    view = this.makeDataView(2);
                    view.setInt16(0, input, false);
                }
            }

            // Zero
            else {
                view = new Uint16Array([0]);
            }
        }
        
        // Floating Point Number:
        else {
            view = this.floatingPoints(input);
        }

        return new Uint8Array(view.buffer);

    }


    bigInts(input) {
        // Since BigInts are not limited to 64 bits, they might
        // overflow the BigInt64Array values. A little more 
        // handwork is therefore needed.

        // as the integer size is not known yet, the bytes get a
        // makeshift home
        const byteArray = new Array();

        if (input > 0) {
            
            const overflow = 18446744073709551616n; 

            while (input >= overflow) {
                byteArray.unshift(input % overflow);
                input >>= 64n;
            }
        }

        else if (input < 0) {
            const overflow = -9223372036854775808n;

            while (input <= overflow) {
                byteArray.unshift(input % overflow);
                input >>= 64n;
            }
        }

        byteArray.unshift(input);

        const byteLen = byteArray.length * 8;

        const buffer = new ArrayBuffer(byteLen);
        const view = new DataView(buffer);

        byteArray.forEach((bigInt, i) => {
            const offset = i * 8;
            view.setBigUint64(offset, bigInt, false);
        });

        return new Uint8Array(view.buffer);
    }


    toBytes(input) {

        let inputUint8;
        
        // Buffer:
        if (input instanceof ArrayBuffer) {
            inputUint8 = new Uint8Array(input)
        }

        // TypedArray or DataView:
        else if (ArrayBuffer.isView(input)) {
            inputUint8 = new Uint8Array(input.buffer);
        }
        
        // String:
        else if (typeof input === "string" || input instanceof String) {
            inputUint8 = new TextEncoder().encode(input);
        }
        
        // Number:
        else if (typeof input === "number" && !isNaN(input) && input !== Infinity) { 
            inputUint8 = this.numbers(input);    
        }

        // BigInt:
        else if (typeof input === "bigint") {
            inputUint8 = this.bigInts(input);
        }

        // Array
        else if (Array.isArray(input)) {
            const collection = new Array();
            for (const elem of input) {
                collection.push(...this.toBytes(elem));
            }
            inputUint8 = Uint8Array.from(collection);
        }

        else {
            throw new TypeError("The provided input type can not be processed.");
        }

        return inputUint8;
    }
}


class BaseEx {
    /*
        Collection of common converters. Ready to use
        instances.
    */
   
    constructor(input="str", output="str") {
        this.base16 = new Base16("default", input, output);
        this.base32_rfc3548 = new Base32("rfc3548", input, output);
        this.base32_rfc4648 = new Base32("rfc4648", input, output);
        this.base64 = new Base64("default", input, output);
        this.base64_urlsafe = new Base64("urlsafe", input, output);
        this.base85adobe = new Base85("adobe", input, output);
        this.base85ascii = new Base85("ascii85", input, output);
        this.base85_z85 = new Base85("z85", input, output);
        this.base91 = new Base91("default", input, output);
    }
}

// This export statement needs to be deactivated for non-modular js
export {Base16, Base32, Base64, Base85, Base91, BaseEx};
