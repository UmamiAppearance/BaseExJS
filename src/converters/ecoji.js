/**
 * [BaseEx|Ecoji Converter]{@link https://github.com/UmamiAppearance/BaseExJS/src/converters/ecoji.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0 OR Apache-2.0
 * @see https://github.com/keith-turner/ecoji
 */

import { BaseConverter, BaseTemplate } from "../core.js";
import { DecodingError } from "../utils.js";

/**
 * BaseEx Ecoji (a Base 1024) Converter.
 * ------------------------------------
 * This an implementation of the Ecoji converter.
 * Various input can be converted to an Ecoji string
 * or an Ecoji string can be decoded into various 
 * formats. Versions 1 and 2 are supported.
 * This variant pretty much follows the standard
 * (at least in its results, the algorithm is very
 * different from the original).
 * A deviation is the handling of padding. The last
 * pad char can be trimmed for both versions and
 * additionally ommitted completely if integrity
 * checks are disabled.
 */
export default class Ecoji extends BaseTemplate {

    #revEmojiVersion = {};
    #padRegex = null;

    /**
     * BaseEx Ecoji Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // charsets
        this.charsets.emojis_v1 = [..."🀄🃏🅰🅱🅾🅿🆎🆑🆒🆓🆔🆕🆖🆗🆘🆙🆚🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯🇰🇱🇲🇳🇴🇵🇶🇷🇸🇹🇺🇻🇼🇽🇾🇿🈁🈂🈚🈯🈲🈳🈴🈵🈶🈷🈸🈹🈺🉐🉑🌀🌁🌂🌃🌄🌅🌆🌇🌈🌉🌊🌋🌌🌍🌎🌏🌐🌑🌒🌓🌔🌕🌖🌗🌘🌙🌚🌛🌜🌝🌞🌟🌠🌡🌤🌥🌦🌧🌨🌩🌪🌫🌬🌭🌮🌯🌰🌱🌲🌳🌴🌵🌶🌷🌸🌹🌺🌻🌼🌽🌾🌿🍀🍁🍂🍃🍄🍅🍆🍇🍈🍉🍊🍋🍌🍍🍎🍏🍐🍑🍒🍓🍔🍕🍖🍗🍘🍙🍚🍛🍜🍝🍞🍟🍠🍡🍢🍣🍤🍥🍦🍧🍨🍩🍪🍫🍬🍭🍮🍯🍰🍱🍲🍳🍴🍵🍶🍷🍸🍹🍺🍻🍼🍽🍾🍿🎀🎁🎂🎃🎄🎅🎆🎇🎈🎉🎊🎋🎌🎍🎎🎏🎐🎑🎒🎓🎖🎗🎙🎚🎛🎞🎟🎠🎡🎢🎣🎤🎥🎦🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏳🏴🏵🏷🏸🏹🏺🏻🏼🏽🏾🏿🐀🐁🐂🐃🐄🐅🐆🐇🐈🐉🐊🐋🐌🐍🐎🐏🐐🐑🐒🐓🐔🐕🐖🐗🐘🐙🐚🐛🐜🐝🐞🐟🐠🐡🐢🐣🐤🐥🐦🐧🐨🐩🐪🐫🐬🐭🐮🐯🐰🐱🐲🐳🐴🐵🐶🐷🐸🐹🐺🐻🐼🐽🐾🐿👀👁👂👃👄👅👆👇👈👉👊👋👌👍👎👏👐👑👒👓👔👕👖👗👘👙👚👛👜👝👞👟👠👡👢👣👤👥👦👧👨👩👪👫👬👭👮👯👰👱👲👳👴👵👶👷👸👹👺👻👼👽👾👿💀💁💂💃💄💅💆💇💈💉💊💋💌💍💎💏💐💑💒💓💔💕💖💗💘💙💚💛💜💝💞💟💠💡💢💣💤💥💦💧💨💩💪💫💬💭💮💯💰💱💲💳💴💵💶💷💸💹💺💻💼💽💾💿📀📁📂📃📄📅📆📇📈📉📊📋📌📍📎📏📐📒📓📔📕📖📗📘📙📚📛📜📝📞📟📠📡📢📣📤📥📦📧📨📩📪📫📬📭📮📯📰📱📲📳📴📵📶📷📸📹📺📻📼📽📿🔀🔁🔂🔃🔄🔅🔆🔇🔈🔉🔊🔋🔌🔍🔎🔏🔐🔑🔒🔓🔔🔕🔖🔗🔘🔙🔚🔛🔜🔝🔞🔟🔠🔡🔢🔣🔤🔥🔦🔧🔨🔩🔪🔫🔬🔭🔮🔯🔰🔱🔲🔳🔴🔵🔶🔷🔸🔹🔺🔻🔼🔽🕉🕊🕋🕌🕍🕎🕐🕑🕒🕓🕔🕕🕖🕗🕘🕙🕚🕛🕜🕝🕞🕟🕠🕡🕢🕣🕤🕥🕦🕧🕯🕰🕳🕴🕵🕶🕷🕸🕹🕺🖇🖊🖋🖌🖍🖐🖕🖖🖤🖥🖨🖱🖲🖼🗂🗃🗄🗑🗒🗓🗜🗝🗞🗡🗣🗨🗯🗳🗺🗻🗼🗽🗾🗿😀😁😂😃😄😅😆😇😈😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳😴😵😶😷😸😹😺😻😼😽😾😿🙀🙁🙂🙃🙄🙅🙆🙇🙈🙉🙊🙌🙍🙎🙏🚀🚁🚂🚃🚄🚅🚆🚇🚈🚉🚊🚋🚌🚍🚎🚏🚐🚑🚒🚓🚔🚕🚖🚗🚘🚙🚚🚛🚜🚝🚞🚟🚠🚡🚢🚣🚤🚥🚦🚧🚨🚩🚪🚫🚬🚭🚮🚯🚰🚱🚲🚳🚴🚵🚶🚷🚸🚹🚺🚻🚼🚽🚾🚿🛀🛁🛂🛃🛄🛅🛋🛌🛍🛎🛏🛐🛑🛒🛠🛡🛢🛣🛤🛥🛩🛫🛬🛰🛳🛴🛵🛶🛷🛸🛹🤐🤑🤒🤓🤔🤕🤖🤗🤘🤙🤚🤛🤜🤝🤞🤟🤠🤡🤢🤣🤤🤥🤦🤧🤨🤩🤪🤫🤬🤭🤮🤯🤰🤱🤲🤳🤴🤵🤶🤷🤸🤹🤺🤼🤽🤾🥀🥁🥂🥃🥄🥅🥇🥈🥉🥊🥋🥌🥍🥎🥏🥐🥑🥒🥓🥔🥕🥖🥗🥘🥙🥚🥛🥜🥝🥞🥟🥠🥡🥢🥣🥤🥥🥦🥧🥨🥩🥪🥫🥬🥭🥮🥯🥰🥳🥴🥵🥶🥺🥼🥽🥾🥿🦀🦁🦂🦃🦄🦅🦆🦇🦈🦉🦊🦋🦌🦍🦎🦏🦐🦑🦒🦓🦔🦕🦖🦗🦘🦙🦚🦛🦜🦝🦞🦟🦠🦡🦢🦰🦱🦲🦳🦴🦵🦶🦷🦸🦹🧀🧁🧂🧐🧑🧒🧓🧔🧕"];
        this.padChars.emojis_v1 = [ "⚜", "🏍", "📑", "🙋", "☕" ];

        this.charsets.emojis_v2 = [..."🀄🃏⏰⏳☔♈♉♊♋♌♍♎♏♐♑♒♓♿⚓⚡⚽⚾⛄⛅⛎⛔⛪⛲⛳⛵⛺⛽✊✋✨⭐🛕🛖🛗🛝🛞🛟🛺🈁🛻🤌🤏🤿🥱🥲🥸🥹🥻🦣🦤🦥🦦🦧🌀🌁🌂🌃🌄🌅🌆🌇🌈🌉🌊🌋🌌🌍🌎🌏🌐🌑🌒🌓🌔🌕🌖🌗🌘🌙🌚🌛🌜🌝🌞🌟🌠🦨🦩🦪🦫🦬🦭🦮🦯🦺🦻🌭🌮🌯🌰🌱🌲🌳🌴🌵🦼🌷🌸🌹🌺🌻🌼🌽🌾🌿🍀🍁🍂🍃🍄🍅🍆🍇🍈🍉🍊🍋🍌🍍🍎🍏🍐🍑🍒🍓🍔🍕🍖🍗🍘🍙🍚🍛🍜🍝🍞🍟🍠🍡🍢🍣🍤🍥🍦🍧🍨🍩🍪🍫🍬🍭🍮🍯🍰🍱🍲🍳🍴🍵🍶🍷🍸🍹🍺🍻🍼🦽🍾🍿🎀🎁🎂🎃🎄🎅🎆🎇🎈🎉🎊🎋🎌🎍🎎🎏🎐🎑🎒🎓🦾🦿🧃🧄🧅🧆🧇🎠🎡🎢🎣🎤🎥🧈🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🧉🧊🧋🏏🏐🏑🏒🏓🧌🧍🧎🧏🧖🧗🧘🧙🧚🧛🧜🧝🏠🏡🏢🏣🏤🏥🏦🧞🏨🏩🏪🏫🏬🏭🏮🏯🏰🧟🏴🧠🧢🏸🏹🏺🧣🧤🧥🧦🧧🐀🐁🐂🐃🐄🐅🐆🐇🐈🐉🐊🐋🐌🐍🐎🐏🐐🐑🐒🐓🐔🐕🐖🐗🐘🐙🐚🐛🐜🐝🐞🐟🐠🐡🐢🐣🐤🐥🐦🐧🐨🐩🐪🐫🐬🐭🐮🐯🐰🐱🐲🐳🐴🐵🐶🐷🐸🐹🐺🐻🐼🐽🐾🧨👀🧩👂👃👄👅👆👇👈👉👊👋👌👍👎👏👐👑👒👓👔👕👖👗👘👙👚👛👜👝👞👟👠👡👢👣👤👥👦👧👨👩👪👫👬👭👮👯👰👱👲👳👴👵👶👷👸👹👺👻👼👽👾👿💀💁💂💃💄💅💆💇💈💉💊💋💌💍💎💏💐💑💒💓💔💕💖💗💘💙💚💛💜💝💞💟💠💡💢💣💤💥💦💧💨💩💪💫💬💭💮💯💰💱💲💳💴💵💶💷💸🧪💺💻💼💽💾💿📀🧫📂📃📄🧬📆📇📈📉📊📋📌📍📎📏📐📒📓📔📕📖📗📘📙📚📛📜📝📞📟📠📡📢📣📤📥📦📧📨📩📪📫📬📭📮📯📰📱📲📳🧭📵📶📷📸📹📺📻📼🧮📿🧯🧰🧱🧲🧳🔅🔆🔇🔈🔉🔊🔋🔌🔍🔎🔏🔐🔑🔒🔓🔔🔕🔖🔗🔘🧴🧵🧶🧷🧸🧹🧺🧻🧼🧽🧾🧿🔥🔦🔧🔨🔩🔪🔫🔬🔭🔮🔯🔰🔱🔲🔳🩰🩱🩲🩳🩴🩸🩹🩺🩻🩼🪀🪁🕋🕌🕍🕎🪂🪃🪄🪅🪆🪐🪑🪒🪓🪔🪕🪖🪗🪘🪙🪚🪛🪜🪝🪞🪟🪠🪡🪢🪣🪤🪥🪦🪧🪨🪩🪪🪫🕺🪬🪰🪱🪲🪳🪴🖕🖖🖤🪵🪶🪷🪸🪹🪺🫀🫁🫂🫃🫄🫅🫐🫑🫒🫓🫔🫕🫖🫗🗻🗼🗽🗾🗿😀😁😂😃😄😅😆😇😈😉😊😋😌😍😎😏😐😑😒😓😔😕😖😗😘😙😚😛😜😝😞😟😠😡😢😣😤😥😦😧😨😩😪😫😬😭😮😯😰😱😲😳😴😵😶😷😸😹😺😻😼😽😾😿🙀🙁🙂🙃🙄🙅🙆🙇🙈🙉🙊🙌🙍🙎🙏🚀🚁🚂🚃🚄🚅🚆🚇🚈🚉🚊🚋🚌🚍🚎🚏🚐🚑🚒🚓🚔🚕🚖🚗🚘🚙🚚🚛🚜🚝🚞🚟🚠🚡🚢🚣🚤🚥🚦🚧🚨🚩🚪🚫🚬🚭🚮🚯🚰🚱🚲🚳🚴🚵🚶🚷🚸🚹🚺🚻🚼🚽🚾🚿🛀🛁🛂🛃🛄🛅🫘🛌🫙🫠🫡🛐🛑🛒🫢🫣🫤🫥🫦🫧🫰🛫🛬🫱🫲🛴🛵🛶🛷🛸🛹🤐🤑🤒🤓🤔🤕🤖🤗🤘🤙🤚🤛🤜🤝🤞🤟🤠🤡🤢🤣🤤🤥🤦🤧🤨🤩🤪🤫🤬🤭🤮🤯🤰🤱🤲🤳🤴🤵🤶🤷🤸🤹🤺🤼🤽🤾🥀🥁🥂🥃🥄🥅🥇🥈🥉🥊🥋🥌🥍🥎🥏🥐🥑🥒🥓🥔🥕🥖🥗🥘🥙🥚🥛🥜🥝🥞🥟🥠🥡🥢🥣🥤🥥🥦🥧🥨🥩🥪🥫🥬🥭🥮🥯🥰🥳🥴🥵🥶🥺🥼🥽🥾🥿🦀🦁🦂🦃🦄🦅🦆🦇🦈🦉🦊🦋🦌🦍🦎🦏🦐🦑🦒🦓🦔🦕🦖🦗🦘🦙🦚🦛🦜🦝🦞🦟🦠🦡🦢🫳🫴🫵🫶🦴🦵🦶🦷🦸🦹🧀🧁🧂🧐🧑🧒🧓🧔🧕"];
        this.padChars.emojis_v2 = [ "🥷", "🛼", "📑", "🙋", "☕" ];
        
        // init mapping for decoding particularites of the two versions
        this.#init();

        // converter
        this.converter = new BaseConverter(1024, 5, 4);

        // predefined settings
        this.padding = true;
        this.padCharAmount = 5;
        this.version = "emojis_v1";
        
        // mutable extra args
        this.isMutable.padding = true;
        this.isMutable.trim = true;

        // set trim option
        this.trim = null;
        this.utils.converterArgs.trim = ["notrim", "trim"];
        
        // apply user settings
        this.utils.validateArgs(args, true);

        if (this.trim === null) {
            this.trim = this.version === "emojis_v2";
        }
    }


    /**
     * Analyzes v1 and two charsets for equal and non
     * eqaul characters to create a revEmojiObj for
     * decoding lookup. Also generates a RegExp object 
     * for handling concatenated strings.
     */
    #init() {

        // Stores all padding for a regex generation.
        const padAll = {};

        // Creates an object which holds all characters
        // of both versions. Unique chars for version one
        // are getting the version value "1", version two "2"
        // and overlaps "3". 
        const revEmojisAdd = (version, set) => {
            set.forEach((char) => {
                if (char in this.#revEmojiVersion) {
                    this.#revEmojiVersion[char].version += version;
                } else {
                    this.#revEmojiVersion[char] = { version };
                }
            });
        };

        // This function adds a padding character of both
        // versions to the object, with additional information
        // about the padding type. In this process each uinique
        // padChar is also added to the "padAll" object. 
        const handlePadding = (version, set, type) => {
            set.forEach(padChar => {
            
                if (padChar in padAll) {
                    this.#revEmojiVersion[padChar].version = 3;
                } else {
                    this.#revEmojiVersion[padChar] = {
                        version,
                        padding: type
                    }
                    padAll[padChar] = type;
                }    
            });
        };

        revEmojisAdd(1, this.charsets.emojis_v1);
        revEmojisAdd(2, this.charsets.emojis_v2);

        handlePadding(1, this.padChars.emojis_v1.slice(0, -1), "last");
        handlePadding(2, this.padChars.emojis_v2.slice(0, -1), "last");
        handlePadding(1, this.padChars.emojis_v1.slice(-1), "fill");
        handlePadding(2, this.padChars.emojis_v2.slice(-1), "fill");

        
        // Create an array of keys for the final regex
        const regexArray = [];

        for (const padChar in padAll) {
            if (padAll[padChar] === "last") {
                regexArray.push(padChar);
            } else {
                regexArray.push(`${padChar}+`);
            }
        }

        // create a regex obj for matching all pad chars 
        this.#padRegex = new RegExp(regexArray.join("|"), "g");
    }


    /**
     * BaseEx Ecoji Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - Ecoji encoded string.
     */
    encode(input, ...args) {

        const applyPadding = ({ output, settings, zeroPadding }) => {

            const charset = this.charsets[settings.version];
            let outArray = [...output];
            
            if (zeroPadding > 1) {
                const padValue = this.converter.padBytes(zeroPadding);
                if (settings.padding) {
                    const padLen = settings.trim ? 1 : padValue;
                    const padArr = new Array(padLen).fill(this.padChars[settings.version].at(-1));
                    outArray.splice(outArray.length-padValue, padValue, ...padArr);
                } else {
                    outArray.splice(outArray.length-padValue, padValue);
                }
            }
            
            else if (zeroPadding === 1) {
                const lastVal = charset.indexOf(outArray.pop());
                const x = lastVal >> 8;
                outArray.push(this.padChars[settings.version].at(x));
            }

            return outArray.join("");
        }
        
        return super.encode(input, null, applyPadding, ...args);
    }

    
    /**
     * BaseEx Ecoji Decoder.
     * @param {string} input - Ecoji String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {

        // Argument validation and output settings
        const settings = this.utils.validateArgs(args);
        input = this.utils.normalizeInput(input);

        let version = settings.version;
        let versionKey = null;

        if (settings.version === "emojis_v1" || settings.version === "emojis_v2") {
            // versonKey can be both v1 or v2
            versionKey = 3;
        }

        // the actual decoding is wrapped in a function
        // for the possibility to call it multiple times
        const decode = (input) => {

            if (versionKey !== null) {
                versionKey = this.#preDecode(input, versionKey, settings.integrity);
                version = (versionKey === 3)
                    ? settings.version
                    : `emojis_v${versionKey}`;
            }

            const charset = this.charsets[version];
            
            const inArray = [...input];
            const lastChar = inArray.at(-1);
            let skipLast = false;

            for (let i=0; i<this.padChars[version].length-1; i++) {                
                if (lastChar === this.padChars[version].at(i)) {
                    inArray.splice(-1, 1, charset.at(i << 8));
                    input = inArray.join("");
                    skipLast = true;
                    break;
                }
            }

            let output = this.converter.decode(input,
                this.charsets[version],
                [],
                false
            );

            if (skipLast) {
                output = new Uint8Array(output.buffer.slice(0, -1));
            }

            return output;
        }

        const matchGroup = [...input.matchAll(this.#padRegex)];

        // decode the input directly if no or just one 
        // match for padding was found
        let output;
        if (matchGroup.length < 2) {
            output = decode(input);
        }
        
        // otherwise decode every group seperatly and join it
        // afterwards
        else {

            const preOutArray = [];
            let start = 0;
            
            matchGroup.forEach(match => {
                const end = match.index + match.at(0).length;
                preOutArray.push(...decode(input.slice(start, end)));
                start = end;
            });

            // in case the last group has no padding, it is not yet
            // decoded -> do it now
            if (start !== input.length) {
                preOutArray.push(...decode(input.slice(start, input.length)));
            }

            output = Uint8Array.from(preOutArray);
        }

        return this.utils.outputHandler.compile(output, settings.outputType);
    }


    /**
     * Determines the version (1/2) and analyzes the input for itegrity.
     * @param {string} input - Input string. 
     * @param {number} versionKey - Version key from former calls (initially alwas 3). 
     * @param {boolean} integrity - If false non standard or wrong padding gets ignored. 
     * @returns {number} - Version key (1|2|3)
     */
    #preDecode(input, versionKey, integrity) {
 
        const inArray = [...input];
        let sawPadding;

        inArray.forEach((char, i) => {

            if (char in this.#revEmojiVersion) {

                const charVersion = this.#revEmojiVersion[char].version;

                // version changes can only happen if the char is
                // not in both versions (not 3)
                if (charVersion !== 3) {
                    if (versionKey === 3) {
                        versionKey = charVersion;
                    } else if (versionKey !== charVersion) {
                        throw new TypeError(`Emojis from different ecoji versions seen : ${char} from emojis_v${charVersion}`);
                    }
                }

                // analyze possible wron padding if integrity checks
                // are enabled
                if (integrity) {
                    const padding = this.#revEmojiVersion[char].padding;
                    if (padding) {

                        // index relative to a group of four bytes
                        const relIndex = i%4;
                        sawPadding = true;

                        if (padding === "fill") {
                            if (relIndex === 0) {
                                throw new TypeError(`Padding unexpectedly seen in first position ${char}`);
                            }
                        } else if (relIndex !== 3) {
                            throw new TypeError(`Last padding seen in unexpected position ${char}`);
                        }
                    }

                    else if (sawPadding) {
                        throw new TypeError("Unexpectedly saw non-padding after padding");
                    }
                }

            } else {
                throw new DecodingError(char);
            }
        });

        // lastely test for invalid string 
        if (integrity && inArray.length % 4) {
            if (
                versionKey === 1 ||
                this.#revEmojiVersion[inArray.at(-1)].padding !== "fill"
            ) {
                throw new TypeError("Unexpected end of data, input data size not multiple of 4");
            }
        }

        return versionKey;
    }
}
