/*
 * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
 *
 * @version 0.4.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0 AND BSD-3-Clause (Base91, Copyright (c) 2000-2006 Joachim Henke)
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


class BaseEx {
    /*
        Collection of common converters. Ready to use
        instances.
    */
   
    constructor(output="buffer") {
        this.base1 = new Base1("default", output);
        this.base16 = new Base16("default", output);
        this.base32_rfc3548 = new Base32("rfc3548", output);
        this.base32_rfc4648 = new Base32("rfc4648", output);
        this.base64 = new Base64("default", output);
        this.base64_urlsafe = new Base64("urlsafe", output);
        this.base85adobe = new Base85("adobe", output);
        this.base85ascii = new Base85("ascii85", output);
        this.base85_z85 = new Base85("z85", output);
        this.base91 = new Base91("default",output);
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
    LEB128,
    SimpleBase,
    ByteConverter,
    BaseEx
};
