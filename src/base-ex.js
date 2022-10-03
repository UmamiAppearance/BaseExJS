/* eslint-disable sort-imports */

/**
 * [BaseEx]{@link https://github.com/UmamiAppearance/BaseExJS}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0 AND BSD-3-Clause (only regarding Base91, Copyright (c) 2000-2006 Joachim Henke)
 */

import Base1         from "./converters/base-1.js";
import Base16        from "./converters/base-16.js";
import Base32        from "./converters/base-32.js";
import Base58        from "./converters/base-58.js";
import Base64        from "./converters/base-64.js";
import UUencode      from "./converters/uuencode.js";
import Base85        from "./converters/base-85.js";
import Base91        from "./converters/base-91.js";
import LEB128        from "./converters/leb-128.js";
import Ecoji         from "./converters/ecoji.js";
import Base2048      from "./converters/base-2048.js";
import SimpleBase    from "./converters/simple-base.js";
import ByteConverter from "./converters/byte-converter.js";

import { DEFAULT_OUTPUT_HANDLER } from "./utils.js";

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
    
    /**
     * BaseEx Base Collection Constructor.
     * @param {string} [outputType] - Output type. 
     */
    constructor(outputType="buffer") {

        if (!DEFAULT_OUTPUT_HANDLER.typeList.includes(outputType)) {
            let message = `Invalid argument '${outputType}' for output type. Allowed types are:\n`;
            message = message.concat(DEFAULT_OUTPUT_HANDLER.typeList.join(", "));

            throw new TypeError(message);
        }

        this.base1 = new Base1("default", outputType);
        this.base16 = new Base16("default", outputType);
        this.base32_crockford = new Base32("rfc4648", outputType);
        this.base32_rfc3548 = new Base32("rfc3548", outputType);
        this.base32_rfc4648 = new Base32("rfc4648", outputType);
        this.base32_zbase32 = new Base32("zbase32", outputType);
        this.base58 = new Base58("default", outputType);
        this.base58_bitcoin = new Base58("bitcoin", outputType);
        this.base58_flickr = new Base58("flickr", outputType);
        this.base64 = new Base64("default", outputType);
        this.base64_urlsafe = new Base64("urlsafe", outputType);
        this.uuencode = new UUencode("default", outputType);
        this.base85_adobe = new Base85("adobe", outputType);
        this.base85_ascii = new Base85("ascii85", outputType);
        this.base85_z85 = new Base85("z85", outputType);
        this.base91 = new Base91("default",outputType);
        this.leb128 = new LEB128("default", outputType);
        this.ecoji_v1 = new Ecoji("emojis_v1", outputType);
        this.ecoji_v2 = new Ecoji("emojis_v2", outputType);
        this.base2048 = new Base2048("default", outputType);
        this.byteConverter = new ByteConverter(outputType);

        this.simpleBase = {};
        for (let i=2; i<37; i++) {
            this.simpleBase[`base${i}`] = new SimpleBase(i, outputType);
        }
    }
}

export { 
    Base1,
    Base16,
    Base32,
    Base58,
    Base64,
    UUencode,
    Base85,
    Base91,
    LEB128,
    Ecoji,
    Base2048,
    SimpleBase,
    ByteConverter,
    BaseEx
};
