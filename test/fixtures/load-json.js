import { readFile } from "fs/promises";

const loadEncodingMap = async () => {
    
    const absPath = import.meta.url.
                    replace("file://", "").
                    split("/").
                    slice(0, -1).
                    concat("encoding-map.json").
                    join("/");

    const encodingMap = JSON.parse(await readFile(absPath));

    return encodingMap;
};

export { loadEncodingMap };
