/**
 * [BaseEx|Base2048 Converter]{@link https://github.com/UmamiAppearance/BaseExJS/src/converters/base-16.js}
 *
 * @version 0.5.0
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license GPL-3.0
 */

import { BaseConverter, BaseTemplate } from "../core.js";

/**
 * BaseEx Base 2048 Converter.
 * ------------------------
 * This is a base2048/converter. Various input can be 
 * converted to a hex string or a hex string can be
 * decoded into various formats. It is possible to 
 * convert in both signed and unsigned mode.
 */
export default class Base2048 extends BaseTemplate {

    /**
     * BaseEx Base2048 Constructor.
     * @param {...string} [args] - Converter settings.
     */
    constructor(...args) {
        super();

        // converter
        this.converter = {
            bsEnc: 11,
            bsEncPad: 3,
            bsDec: 8
        }
        
        // default settings
        this.charsets.default = [..."89ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÆÐØÞßæðøþĐđĦħıĸŁłŊŋŒœŦŧƀƁƂƃƄƅƆƇƈƉƊƋƌƍƎƏƐƑƒƓƔƕƖƗƘƙƚƛƜƝƞƟƢƣƤƥƦƧƨƩƪƫƬƭƮƱƲƳƴƵƶƷƸƹƺƻƼƽƾƿǀǁǂǃǝǤǥǶǷȜȝȠȡȢȣȤȥȴȵȶȷȸȹȺȻȼȽȾȿɀɁɂɃɄɅɆɇɈɉɊɋɌɍɎɏɐɑɒɓɔɕɖɗɘəɚɛɜɝɞɟɠɡɢɣɤɥɦɧɨɩɪɫɬɭɮɯɰɱɲɳɴɵɶɷɸɹɺɻɼɽɾɿʀʁʂʃʄʅʆʇʈʉʊʋʌʍʎʏʐʑʒʓʔʕʖʗʘʙʚʛʜʝʞʟʠʡʢʣʤʥʦʧʨʩʪʫʬʭʮʯͰͱͲͳͶͷͻͼͽͿΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρςστυφχψωϏϗϘϙϚϛϜϝϞϟϠϡϢϣϤϥϦϧϨϩϪϫϬϭϮϯϳϷϸϺϻϼϽϾϿЂЄЅІЈЉЊЋЏАБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзиклмнопрстуфхцчшщъыьэюяђєѕіјљњћџѠѡѢѣѤѥѦѧѨѩѪѫѬѭѮѯѰѱѲѳѴѵѸѹѺѻѼѽѾѿҀҁҊҋҌҍҎҏҐґҒғҔҕҖҗҘҙҚқҜҝҞҟҠҡҢңҤҥҦҧҨҩҪҫҬҭҮүҰұҲҳҴҵҶҷҸҹҺһҼҽҾҿӀӃӄӅӆӇӈӉӊӋӌӍӎӏӔӕӘәӠӡӨөӶӷӺӻӼӽӾӿԀԁԂԃԄԅԆԇԈԉԊԋԌԍԎԏԐԑԒԓԔԕԖԗԘԙԚԛԜԝԞԟԠԡԢԣԤԥԦԧԨԩԪԫԬԭԮԯԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄՅՆՇՈՉՊՋՌՍՎՏՐՑՒՓՔՕՖաբգդեզէըթժիլխծկհձղճմյնշոչպջռսվտրցւփքօֆאבגדהוזחטיךכלםמןנסעףפץצקרשתװױײؠءابةتثجحخدذرزسشصضطظعغػؼؽؾؿفقكلمنهوىي٠١٢٣٤٥٦٧٨٩ٮٯٱٲٳٴٹٺٻټٽپٿڀځڂڃڄڅچڇڈډڊڋڌڍڎڏڐڑڒړڔڕږڗژڙښڛڜڝڞڟڠڡڢڣڤڥڦڧڨکڪګڬڭڮگڰڱڲڳڴڵڶڷڸڹںڻڼڽھڿہۃۄۅۆۇۈۉۊۋیۍێۏېۑےەۮۯ۰۱۲۳۴۵۶۷۸۹ۺۻۼۿܐܒܓܔܕܖܗܘܙܚܛܜܝܞܟܠܡܢܣܤܥܦܧܨܩܪܫܬܭܮܯݍݎݏݐݑݒݓݔݕݖݗݘݙݚݛݜݝݞݟݠݡݢݣݤݥݦݧݨݩݪݫݬݭݮݯݰݱݲݳݴݵݶݷݸݹݺݻݼݽݾݿހށނރބޅކއވމފދތލގޏސޑޒޓޔޕޖޗޘޙޚޛޜޝޞޟޠޡޢޣޤޥޱ߀߁߂߃߄߅߆߇߈߉ߊߋߌߍߎߏߐߑߒߓߔߕߖߗߘߙߚߛߜߝߞߟߠߡߢߣߤߥߦߧߨߩߪࠀࠁࠂࠃࠄࠅࠆࠇࠈࠉࠊࠋࠌࠍࠎࠏࠐࠑࠒࠓࠔࠕࡀࡁࡂࡃࡄࡅࡆࡇࡈࡉࡊࡋࡌࡍࡎࡏࡐࡑࡒࡓࡔࡕࡖࡗࡘࡠࡡࡢࡣࡤࡥࡦࡧࡨࡩࡪࢠࢡࢢࢣࢤࢥࢦࢧࢨࢩࢪࢫࢬࢭࢮࢯࢰࢱࢲࢳࢴࢶࢷࢸࢹࢺࢻࢼࢽऄअआइईउऊऋऌऍऎएऐऑऒओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलळवशषसहऽॐॠॡ०१२३४५६७८९ॲॳॴॵॶॷॸॹॺॻॼॽॾॿঀঅআইঈউঊঋঌএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহঽৎৠৡ০১২৩৪৫৬৭৮৯ৰৱ৴৵৶৷৸৹ৼਅਆਇਈਉਊਏਐਓਔਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਵਸਹੜ੦੧੨੩੪੫੬੭੮੯ੲੳੴઅઆઇઈઉઊઋઌઍએઐઑઓઔકખગઘઙચછજઝઞટઠડઢણતથદધનપફબભમયરલળવશષસહઽૐૠૡ૦૧૨૩૪૫૬૭૮૯ૹଅଆଇଈଉଊଋଌଏଐଓଔକଖଗଘଙଚଛଜଝଞଟଠଡଢଣତଥଦଧନପଫବଭମଯରଲଳଵଶଷସହଽୟୠୡ୦୧୨୩୪୫୬୭୮୯ୱ୲୳୴୵୶୷ஃஅஆஇஈஉஊஎஏஐஒஓகஙசஜஞடணதநனபமயரறலளழவஶஷஸஹௐ௦௧௨௩௪௫௬௭௮௯௰௱௲అఆఇఈఉఊఋఌఎఏఐఒఓఔకఖగఘఙచఛజఝఞటఠడఢణతథదధనపఫబభమయరఱలళఴవశషసహఽౘౙౚౠౡ౦౧౨౩౪౫౬౭౮౯౸౹౺౻౼౽౾ಀಅಆಇಈಉಊಋಌಎಏಐಒಓಔಕಖಗಘಙಚಛಜಝಞಟಠಡಢಣತಥದಧನಪಫಬಭಮಯರಱಲಳವಶಷಸಹಽೞೠೡ೦೧೨೩೪೫೬೭೮೯ೱೲഅആഇഈഉഊഋഌഎഏഐഒഓഔകഖഗഘങചഛജഝഞടഠഡഢണതഥദധനഩപഫബഭമയരറലളഴവശഷസഹഺഽൎൔൕൖ൘൙൚൛൜൝൞ൟൠൡ൦൧൨൩൪൫൬൭൮൯൰൱൲൳൴൵൶൷൸ൺൻർൽൾൿඅආඇඈඉඊඋඌඍඎඏඐඑඒඓඔඕඖකඛගඝඞඟචඡජඣඤඥඦටඨඩඪණඬතථදධනඳපඵබභමඹයරලවශෂසහළෆ෦෧෨෩෪෫෬෭෮෯กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรฤลฦวศษสหฬอฮฯะาเแโใไๅ๐๑๒๓๔๕๖๗๘๙ກຂຄງຈຊຍດຕຖທນບປຜຝພຟມຢຣລວສຫອຮຯະາຽເແໂໃໄ໐໑໒໓໔໕໖໗໘໙ໞໟༀ༠༡༢༣༤༥༦༧༨༩༪༫༬༭༮༯༰༱༲༳ཀཁགངཅཆཇཉཊཋཌཎཏཐདནཔཕབམཙཚཛཝཞཟའཡརལཤཥསཧཨཪཫཬྈྉྊྋྌကခဂဃငစဆဇဈဉညဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠအဢဣဤဥဧဨဩဪဿ၀၁၂၃၄၅၆၇၈၉ၐၑၒၓၔၕ"];
        this.padChars.default = [..."01234567"];

        this.hasSignedMode = true;
        
        // mutable extra args
        // --

        // apply user settings
        this.utils.validateArgs(args, true);
    }


    /**
     * BaseEx Base2048 Encoder.
     * @param {*} input - Input according to the used byte converter.
     * @param  {...str} [args] - Converter settings.
     * @returns {string} - Base2048 encoded string.
     */
    encode(input, ...args) {

        const settings = this.utils.validateArgs(args);
        let inputBytes = this.utils.inputHandler.toBytes(input, settings).at(0);

        const charset = this.charsets[settings.version];
        const padChars = this.padChars[settings.version];

        let output = "";
        let z = 0;
        let numZBits = 0;

        inputBytes.forEach(uint8 => {
            
            for (let i=this.converter.bsDec-1; i>=0; i--) {

                z = (z << 1) + ((uint8 >> i) & 1);
                numZBits++;

                if (numZBits === this.converter.bsEnc) {
                    output += charset.at(z);
                    z = 0
                    numZBits = 0
                }
            }
        });

        if (numZBits !== 0) {
            
            let bitCount;
            let isPadding;

            if (numZBits <= this.converter.bsEncPad) {
                bitCount = this.converter.bsEncPad;
                isPadding = true;
            } else {
                bitCount = this.converter.bsEnc 
                isPadding = false;
            }

            while (numZBits !== bitCount) {
                z = (z << 1) + 1
                numZBits++
                if (numZBits > this.converter.bsEnc) {
                    throw new Error("Cannot process input. This is a bug!");
                }
            }
          
            if (isPadding) { 
                output += padChars.at(z);
            } else {
                output += charset.at(z);
            }
        }

        return output;
    }

    
    /**
     * BaseEx Base2048 Decoder.
     * @param {string} input - Base2048/Hex String.
     * @param  {...any} [args] - Converter settings.
     * @returns {*} - Output according to converter settings.
     */
    decode(input, ...args) {

        // apply settings
        const settings = this.utils.validateArgs(args);

        // ensure a string input
        input = String(input);
        const inArray = [...input];

        const charset = this.charsets[settings.version];
        const padChars = this.padChars[settings.version];

        const byteArray = new Array();
        let uint8 = 0;
        let numUint8Bits = 0;

        inArray.forEach((c, i) => {

            let numZBits;
            let z = charset.indexOf(c);
            if (z > -1) { 
                numZBits = this.converter.bsEnc;
            } else {
                z = padChars.indexOf(c);

                if (z > -1) {
                    if (i+1 !== inArray.length) {
                        throw new Error(`Secondary character found before end of input, index: ${i}`);    
                    }

                    numZBits = this.converter.bsEncPad;
                }
                
                else if (settings.integrity) {
                    throw new TypeError(`Invalid input. Character: '${c}' is not part of the charset.`)
                }
            }

            // Take most significant bit first
            for (let j = numZBits - 1; j >= 0; j--) {
                const bit = (z >> j) & 1

                uint8 = (uint8 << 1) + bit
                numUint8Bits++

                if (numUint8Bits === this.converter.bsDec) {
                    byteArray.push(uint8);
                    uint8 = 0;
                    numUint8Bits = 0;
                }
            }
        });

        // TODO: required?
        // Final padding bits! Requires special consideration!
        // Remember how we always pad with 1s?
        // Note: there could be 0 such bits, check still works though
        if (uint8 !== ((1 << numUint8Bits) - 1)) {
            throw new TypeError("Padding mismatch");
        }

        return this.utils.outputHandler.compile(
            Uint8Array.from(byteArray),
            settings.outputType
        );
    }
}
