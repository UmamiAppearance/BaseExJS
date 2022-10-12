/**
 * [BaseEx|Base512 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/blob/main/src/converters/base-512.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

 import { BaseTemplate } from "../core.js";

 /**
  * BaseEx Base 512 Converter.
  * ------------------------
  * 
  * This is a base512 converter. Various input can be 
  * converted to a base512 string or a base512 string
  * can be decoded into various formats.
  * 
  * Available charsets are:
  *  - default
  *  - urlsafe
  */
 export default class Base512 extends BaseTemplate {
 
    /**this.padChars.
     * BaseEx Base512 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();
        
        // converter (properties only)
        this.converter = {
            radix: 512,
            bsEnc: 0,
            bsDec: 0
        }

        // charsets
        this.charsets.default = [..."ĀāĂăĄąĆćĈĉĊċČčĎďĐđĒēĔĕĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſƀƁƂƃƄƅƆƇƈƉƊƋƌƍƎƏƐƑƒƓƔƕƖƗƘƙƚƛƜƝƞƟƠơƢƣƤƥƦƧƨƩƪƫƬƭƮƯưƱƲƳƴƵƶƷƸƹƺƻƼƽƾƿǀǁǂǃǄǅǆǇǈǉǊǋǌǍǎǏǐǑǒǓǔǕǖǗǘǙǚǛǜǝǞǟǠǡǢǣǤǥǦǧǨǩǪǫǬǭǮǯǰǱǲǳǴǵǶǷǸǹǺǻǼǽǾǿȀȁȂȃȄȅȆȇȈȉȊȋȌȍȎȏȐȑȒȓȔȕȖȗȘșȚțȜȝȞȟȠȡȢȣȤȥȦȧȨȩȪȫȬȭȮȯȰȱȲȳȴȵȶȷȸȹȺȻȼȽȾȿɀɁɂɃɄɅɆɇɈɉɊɋɌɍɎɏɐɑɒɓɔɕɖɗɘəɚɛɜɝɞɟɠɡɢɣɤɥɦɧɨɩɪɫɬɭɮɯɰɱɲɳɴɵɶɷɸɹɺɻɼɽɾɿʀʁʂʃʄʅʆʇʈʉʊʋʌʍʎʏʐʑʒʓʔʕʖʗʘʙʚʛʜʝʞʟʠʡʢʣʤʥʦʧʨʩʪʫʬʭʮʯʰʱʲʳʴʵʶʷʸʹʺʻʼʽʾʿˀˁ˂˃˄˅ˆˇˈˉˊˋˌˍˎˏːˑ˒˓˔˕˖˗˘˙˚˛˜˝˞˟ˠˡˢˣˤ˥˦˧˨˩˪˫ˬ˭ˮ˯˰˱˲˳˴˵˶˷˸˹˺˻˼˽˾˿"];
        this.padChars.default = "=";

        // predefined settings
        this.padCharAmount = 1;
        this.padding = true;
        
        // mutable extra args
        this.isMutable.padding = true;

        // apply user settings
        this.utils.validateArgs(args, true);
    }

    /**
     * BaseEx basE91 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - basE91 encoded string.
     */
    encode(input, ...args) {
    
        // argument validation and input settings
        const settings = this.utils.validateArgs(args);
        const inputBytes = this.utils.inputHandler.toBytes(input, settings)[0];

        let bitCount = 0;
        let n = 0;
        let output = "";

        const charset = this.charsets[settings.version];


        inputBytes.forEach(byte => {
            //n = n + byte * 2^bitcount;
            n += (byte << bitCount);
            console.log("N", n);

            // Add 8 bits forEach byte
            console.log(bitCount);
            bitCount += 8;
            
            if (bitCount > 8) {

                let shiftVal = 8;
                while (shiftVal-- && shiftVal % 8) {
                    let index = n >> shiftVal;
                    console.log("index", index);
                    if (index >= 512) {
                        output += charset.at(index-512);
                        bitCount -= (8 + shiftVal);
                        break;
                    }
                } 
            }
        });

        console.log(n);

        return output;
        
    }
 
}
