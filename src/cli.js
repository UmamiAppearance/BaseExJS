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


const baseEx = new BaseEx("str");

const convert = (converter, mode, input) => {
    process.stdout.write(baseEx[converter][mode](input));
    process.stdout.write("\n");
    process.exit(0);
}

if (argv.CONVERTER in baseEx) {

    const mode = ("decode" in argv) ? "decode" : "encode";
    
    if (!argv.FILE || argv.FILE === "-") {
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
        console.log(file);

    }

    
}

else {
    process.stderr.write("\nConverters:\n  * ");
    process.stderr.write(Object.keys(baseEx).join("\n  * "));
    process.stderr.write("\n---------------------\n")
    process.stderr.write("Unknown converter. See the options above.\n");
    process.exit(1);
}
