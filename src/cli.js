import { readFile, stat, writeFile } from "fs/promises";
import { hideBin } from "yargs/helpers";
import yargs from "yargs";
import { BaseEx } from "base-ex";

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
        type: "string",
    },
    "ignore-garbage": {
        alias: "i",
        coerce: coerceLastValue,
        description: "When decoding, ignore non-alphabet characters.",
        type: "boolean",
    }
};

const { argv } = yargs(hideBin(process.argv))
    .version(VERSION)
    .usage("$0 <CONVERTER> [FILE]")
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


const baseEx = new BaseEx();

const encode = (converter, input) => {
    process.stdout.write(baseEx[converter].encode(input));
    process.stdout.write("\n");
    process.exit(0);
}

if (argv.CONVERTER in baseEx) {
    
    if (!argv.FILE || argv.FILE === "-") {
        process.stdin.on("data", input => {
            encode(argv.CONVERTER, input);
        })
    }

    
}

else {
    process.stderr.write("\nConverters:\n  * ");
    process.stderr.write(Object.keys(baseEx).join("\n  * "));
    process.stderr.write("\n---------------------\n")
    process.stderr.write("Unknown converter. See the options above.\n");
    process.exit(1);
}
