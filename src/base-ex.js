/*
 * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
 *
 * @version 0.4.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0 AND BSD-3-Clause (Base91, Copyright (c) 2000-2006 Joachim Henke)
 */


/**
 * En-/decoding to and from base16 (hexadecimal).
 * For integers two's complement system is getting used.
 * 
 * Requires: 
 * -> BaseConverter
 * -> Utils (-> SmartInput)
 */

import { Base1 }  from "./base-1.js";
import { Base16 } from "./base-16.js";
import { Base32 } from "./base-32.js";
import { Base64 } from "./base-64.js";
import { Base85 } from "./base-85.js";
import { Base91 } from "./base-91.js";
import { SimpleBase } from "./simple-base.js";


class BaseEx {
    /*
        Collection of common converters. Ready to use
        instances.
    */
   
    constructor(output="buffer") {
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

export { Base1, Base16, Base32, Base64, Base85, Base91, SimpleBase, BaseEx };
