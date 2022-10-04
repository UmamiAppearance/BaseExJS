import { readFile, stat } from "fs/promises";
import { BaseEx } from "base-ex";
import { hideBin } from "yargs/helpers";
import yargs from "yargs";


// config values
const VERSION = await (async () => {
    const conf = JSON.parse(
        await readFile(
            new URL("../package.json", import.meta.url)
        )
    );
    return conf.version;
})();


const coerceLastValue = value => Array.isArray(value) ? value.pop() : value;
const FLAGS = {
    "decode": {
        alias: "d",
        coerce: coerceLastValue,
        description: "Decode data.",
        type: "string"
    },
    "ignore-garbage": {
        alias: "i",
        coerce: coerceLastValue,
        description: "When decoding, ignore non-alphabet characters.",
        type: "boolean"
    },
    "upper": {
        alias: "u",
        coerce: coerceLastValue,
        description: "When decoding, return upper case character (if the encoder is case insensitive).",
        type: "boolean"
    },
    "lower": {
        alias: "l",
        coerce: coerceLastValue,
        description: "When decoding, return lower case character (if the encoder is case insensitive).",
        type: "boolean"
    },
    "wrap": {
        alias: "w",
        coerce: coerceLastValue,
        description: "Wrap encoded lines after COLS character (default 76). Use 0 to disable line wrapping.",
        type: "number",
        default: 76
    }
};

const { argv } = yargs(hideBin(process.argv))
    .version(VERSION)
    .usage("$0 <CONVERTER> [OPTIONS] [FILE]")
    .command("* <CONVERTER> [FILE]", "", yargs => yargs.options(FLAGS)
        .positional("CONVERTER", {
            array: false,
            describe: "CONVERTER encode or decode FILE, or standard input, to standard output.",
            type: "string",
        })
        .positional("FILE", {
            array: false,
            describe: "With no FILE, or when FILE is -, read standard input.",
            type: "string",
        })
    )
    .example("cat file.txt | $0")
    .example("$0 file.txt")
    .example("cat file.txt | $0 -d")
    .example("$0 file.txt -d")


const baseEx = new BaseEx("str");

const options = {
    lineWrap: argv.wrap
}
const extraArgs = [ options ];
if ("ignoreGarbage" in argv) extraArgs.push("nointegrity");
if ("upper" in argv) extraArgs.push("upper");
if ("lower" in argv) extraArgs.push("lower");

const convert = (converter, mode, input) => {
    process.stdout.write(baseEx[converter][mode](input, ...extraArgs));
    process.stdout.write("\n");
    process.exit(0);
}

if (argv.CONVERTER in baseEx) {

    const mode = ("decode" in argv) ? "decode" : "encode";

    if (argv.CONVERTER === "uuencode" || argv.CONVERTER === "xxencode") {
        extraArgs.push("header");
    }
    
    if (!argv.FILE || argv.FILE === "-") {
        options.file = "/dev/stdin";
        options.permissions = "777";
        process.stdin.on("data", input => {
            convert(argv.CONVERTER, mode, input.toString().trim());
        })
    }

    else {
        let file;
        try { 
            file = await stat(argv.FILE);
        } catch (err) {
            process.stderr.write(`base-ex: ${argv.FILE}: `);

            if (err.code === 'ENOENT') {
                process.stderr.write("No such file or directory.\n");
            } else {
                process.stderr.write("Cannot stat file\n");
            }

            process.exit(1);
        }

        options.file = argv.FILE.replace(/.*\//, "");
        options.permissions = (file.mode & 0x1ff).toString(8);
        
        let input;
        try {
            input = await readFile(argv.FILE);
        } catch (err) {
            process.stderr.write("base-ex: ");
            process.stderr.write(err);
            process.stderr.write("\n");
            process.exit(2);
        }

        if (mode === "decode") {
            convert(argv.CONVERTER, "decode", input.toString().trim());
        } else {
            convert(argv.CONVERTER, "encode", input);
        }
    }

    
}

else {
    process.stderr.write("\nConverters:\n  * ");
    process.stderr.write(Object.keys(baseEx).join("\n  * "));
    process.stderr.write("\n---------------------\n")
    process.stderr.write("Unknown converter. See the options above.\n");
    process.exit(1);
}
