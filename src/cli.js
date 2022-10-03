import { readFile, stat, writeFile } from "fs/promises";
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
    .usage("$0 [FILE]")
    .command("* [FILE]", "Run tests", yargs => yargs.options(FLAGS).positional("FILE", {
        array: false,
        describe: "With no FILE, or when FILE is -, read standard input.",
        type: "string",
    }))
    .example("cat file.txt | $0")
    .example("$0 file.txt")
    .example("cat file.txt | $0 -d")
    .example("$0 file.txt -d")

