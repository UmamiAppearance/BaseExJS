/*
 * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
 *
 * @version 0.4.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0 AND BSD-3-Clause (only regarding Base91, Copyright (c) 2000-2006 Joachim Henke)
 */

import { Base1 }  from "./converters/base-1.js";
import { Base16 } from "./converters/base-16.js";
import { Base32 } from "./converters/base-32.js";
import { Base58 } from "./converters/base-58.js";
import { Base64 } from "./converters/base-64.js";
import { Base85 } from "./converters/base-85.js";
import { Base91 } from "./converters/base-91.js";
import { ByteConverter } from "./converters/byte-converter.js";
import { LEB128 } from "./converters/leb-128.js";
import { SimpleBase } from "./converters/simple-base.js";

/**
 * BaseEx Converter Collection.
 * ---------------------------
 * This class holds almost any available converter
 * of the whole BaseEx converter collection. The 
 * instances are ready to use. Various input can be 
 * converted to a base string or the base string can be
 * decoded into various formats.
 */
class BaseEx {
   
    constructor(output="buffer") {
        this.base1 = new Base1("default", output);
        this.base16 = new Base16("default", output);
        this.base32_crockford = new Base32("rfc4648", output);
        this.base32_rfc3548 = new Base32("rfc3548", output);
        this.base32_rfc4648 = new Base32("rfc4648", output);
        this.base32_zbase32 = new Base32("zbase32", output);
        this.base58 = new Base58("default", output);
        this.base58_bitcoin = new Base58("bitcoin", output);
        this.base58_flickr = new Base58("flickr", output);
        this.base64 = new Base64("default", output);
        this.base64_urlsafe = new Base64("urlsafe", output);
        this.base85adobe = new Base85("adobe", output);
        this.base85ascii = new Base85("ascii85", output);
        this.base85_z85 = new Base85("z85", output);
        this.base91 = new Base91("default",output);
        this.leb128 = new LEB128("default", output);
        this.byteConverter = new ByteConverter()
    }
}

export { 
    Base1,
    Base16,
    Base32,
    Base58,
    Base64,
    Base85,
    Base91,
    ByteConverter,
    LEB128,
    SimpleBase,
    BaseEx
};
