/**
 * JavaScript/AVA implementation
 * @see https://github.com/keith-turner/ecoji/blob/ecojiv2/test_scripts/ecoji_test.sh
 */


import { readFile, readdir } from "fs/promises";
import { Ecoji } from "base-ex";
import test from "ava";

// macros
const enDecodeTest = test.macro((t, input, expected, ecoji) => {
    const output = ecoji.encode(input);
    t.is(output, expected);
    t.deepEqual(ecoji.decode(output), input);
});

const decodeTest = test.macro((t, input, expected, ecoji, ...args) => {
    t.is(ecoji.decode(input, ...args), expected);
});

const errorTest = test.macro((t, input, ecoji) => {
    t.throws(() => ecoji.decode(input));
});


// declarations
const path = "./test/fixtures/ecoji/";
const files = await (readdir(path));
const ecojiV1 = new Ecoji("emojis_v1", "uint8");
const ecojiV2 = new Ecoji("emojis_v2", "uint8");


// test group file lists
const plainFilesA = files.filter(f => (/\.plain$/).test(f));
const aLen = plainFilesA.length;

const plainFilesB = files.filter(f => (/\.plaind$/).test(f));
const bLen = plainFilesB.length;

const garbage = files.filter(f => (/\.garbage$/).test(f));
const gLen = garbage.length;


// test data generation
const dataA = await Promise.all(
    plainFilesA.map(async plainFile => {
        const bareName = plainFile.slice(0, -6);
        
        const input = new Uint8Array(await readFile(`${path}${plainFile}`));
        
        const expectedV1 = await readFile(`${path}${bareName}.ev1`, "utf-8");
        const expectedV2 = await readFile(`${path}${bareName}.ev2`, "utf-8");
        
        return {
            input,
            expectedV1,
            expectedV2
        } 
    })
);

const dataB = await Promise.all(
    plainFilesB.map(async plainFile => {
        const bareName = plainFile.slice(0, -7);
        
        const input = await readFile(`${path}${bareName}.enc`, "utf-8");
        const expected = await readFile(`${path}${plainFile}`, "utf-8");

        return {
            input,
            expected
        }
    })
);

const dataC = await Promise.all(
    garbage.map(
        async plainFile => readFile(`${path}${plainFile}`)
    )
);


// tests
dataA.forEach((data, i) => {
    test(`En- and decoding for Ecoji Version 1, Test: [${i+1}|${aLen}]`, enDecodeTest, data.input, data.expectedV1, ecojiV1);
    test(`En- and decoding for Ecoji Version 2, Test: [${i+1}|${aLen}]`, enDecodeTest, data.input, data.expectedV2, ecojiV2); 
});

dataB.forEach((data, i) => {
    test(`Decode sample data for both versions, Test: [${i+1}|${bLen}]`, decodeTest, data.input, data.expected, ecojiV2, "str"); 
});

dataC.forEach((data, i) => {
    test(`Garbage input > throw Error, Test: [${i+1}|${gLen}]`, errorTest, data, ecojiV2); 
});
