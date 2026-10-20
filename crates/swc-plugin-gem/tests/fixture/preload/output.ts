// @ts-nocheck
import src from "xxxx.png?url";
import _data from "xxxx.data?url";
import _font from "xxxx.woff2?url";
const font = await fetch(_font).then((e)=>e.arrayBuffer());
const data = await fetch(_data).then((e)=>e.arrayBuffer());
await new Promise((onload, onerror)=>Object.assign(new Image, {
        src: src,
        onload,
        onerror
    }));
console.log(1);
