import { readFile } from "fs"; 

const readFileNode = async (filename) => {
    const readFileAsync = (filename) => new Promise((resolve, reject) => {
        readFile(filename, (err, data) => {
            if (err) { 
                reject(err); 
            } else { 
                resolve(JSON.parse(data));
            }
        });
    });

    const json = await readFileAsync(filename); 
    return json;
};

const loadEncodingMap = async () => {
    
    const absPath = import.meta.url.
                    replace("file://", "").
                    split("/").
                    slice(0, -1).
                    concat("encoding-map.json").
                    join("/");

    const encodingMap = await readFileNode(absPath);

    return encodingMap;
};

export { loadEncodingMap };
