
import { readdir, readFile } from "fs/promises";
import { Ecoji } from "base-ex";
import test from "ava";

const endDecodeTest = test.macro(async (t, input, expected, base, ...args) => {
    const output = base.encode(input, ...args);
    t.is(output, expected);
    t.deepEqual(base.decode(output, ...args), input);
});


console.log(process.cwd());

const path = "./test/fixtures/ecoji/";
const files = await (readdir(path));

const plainFilesA = files.filter(f => (/\.plain$/).test(f));
//const plainFilesB = files.filter(f => (/\.plaind$/).test(f));
//const garbage = files.filter(f => (/\.garbage$/).test(f));

const ecojiV1 = new Ecoji("emojis_v1", "uint8");
const ecojiV2 = new Ecoji("emojis_v2", "uint8");

const testsA = plainFilesA.map(async plainFile => {
    const bareName = plainFile.slice(0, -6);
    
    const input = new Uint8Array(await readFile(`${path}${plainFile}`));
    
    const expectedV1 = await readFile(`${path}${bareName}.ev1`, "utf-8");
    const expectedV2 = await readFile(`${path}${bareName}.ev2`, "utf-8");
    
    return {
        input,
        expectedV1,
        expectedV2
    }
    
});

const testAResults = await Promise.all(testsA);

testAResults.forEach((t, i) => {
    test(`En- and decoding for Ecoji Version 1 (test: ${i})`, endDecodeTest, t.input, t.expectedV1, ecojiV1);
    test(`En- and decoding for Ecoji Version 2 (test: ${i})`, endDecodeTest, t.input, t.expectedV2, ecojiV2); 
});

/*
for (const plainFile of plainFilesB) {
    const bareName = plainFile.slice(0, -7);
    
    const input = await readFile(`${path}${bareName}.enc`);
    const expected = await readFile(`${path}${plainFile}`, "utf-8");

    const output = ecojiV2.decode(input, "str");

}

for (const plainFile of garbage) {
    const input = await readFile(`${path}${plainFile}`);
    //const output = ecojiV2.decode(input, "str");

}
*/