import { Ecoji } from "base-ex";
//import { baseTest } from "./fixtures/helpers.js";
import { readdir, readFile } from "fs/promises";
//import test from "ava";

const path = "./fixtures/ecoji/";
const files = await (readdir("./fixtures/ecoji"));

const plainFilesA = files.filter(f => (/\.plain$/).test(f));
const plainFilesB = files.filter(f => (/\.plaind$/).test(f));
const garbage = files.filter(f => (/\.garbage$/).test(f));

const ecojiV1 = new Ecoji("emojis_v1");
const ecojiV2 = new Ecoji("emojis_v2");

for (const plainFile of plainFilesA) {
    const bareName = plainFile.slice(0, -6);
    
    const input = await readFile(`${path}${plainFile}`);
    
    const expectedV1 = await readFile(`${path}${bareName}.ev1`, "utf-8");
    const expectedV2 = await readFile(`${path}${bareName}.ev2`, "utf-8");
    
    const outputV1 = ecojiV1.encode(input);
    const outputV2 = ecojiV2.encode(input);
    
}

for (const plainFile of plainFilesB) {
    const bareName = plainFile.slice(0, -7);
    
    const input = await readFile(`${path}${bareName}.enc`);
    const expected = await readFile(`${path}${plainFile}`, "utf-8");

    const output = ecojiV2.decode(input, "str");

}

for (const plainFile of garbage) {
    const input = await readFile(`${path}${plainFile}`, "utf-8");
    try {
        const output = ecojiV2.decode(input, "str");
        console.log("no", plainFile);
        console.log(input);
        console.log(output);
    } catch (e) {
        console.log("yes");
    }
}
