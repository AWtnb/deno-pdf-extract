import { sprintf } from "jsr:@std/fmt/printf";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { PDFDocument, PDFPage } from "https://cdn.skypack.dev/pdf-lib?dts";

const withSuffix = (path: string, suffix: string): string => {
    const parts = path.split(".");
    const extension = parts.pop() || "pdf";
    return parts.join(".") + suffix + "." + extension;
};

const extractPages = async (
    path: string,
    fromIdx: number,
    toIdx: number,
): Promise<number> => {
    const data = await Deno.readFile(path);
    const srcDoc = await PDFDocument.load(data);
    const outDoc = await PDFDocument.create();
    const pCount = srcDoc.getPageCount();

    if (fromIdx < 0) {
        fromIdx = pCount + fromIdx;
    }
    if (toIdx < 0) {
        toIdx = pCount + toIdx;
    }
    const range = srcDoc.getPageIndices().filter((idx: number) => {
        return fromIdx <= idx && idx <= toIdx;
    });
    if (range.length < 1) {
        console.log("invalid range!");
        return 1;
    }
    const pages = await outDoc.copyPages(srcDoc, range);

    pages.forEach((page: PDFPage) => {
        outDoc.addPage(page);
    });
    const bytes = await outDoc.save();
    const suf = sprintf("_p%03d-p%03d", fromIdx + 1, toIdx + 1);
    const outPath = withSuffix(path, suf);
    await Deno.writeFile(outPath, bytes);
    return 0;
};

const parsePage = (nombre: string): number => {
    const n = Number(nombre);
    if (0 < n) {
        return n - 1;
    }
    return n;
};

const main = async () => {
    const flags = parseArgs(Deno.args, {
        string: ["path", "frompage", "topage"],
        default: {
            path: "",
            frompage: "1",
            topage: "-1",
        },
    });
    const invalids = [flags.frompage, flags.topage].filter((a) => {
        return isNaN(Number(a));
    });
    if (0 < invalids.length) {
        invalids.forEach((s) => {
            console.log("invalid arg:", s);
        });
        Deno.exit(1);
    }
    const fromIdx: number = parsePage(flags.frompage);
    const toIdx: number = parsePage(flags.topage);
    const result = await extractPages(
        flags.path,
        fromIdx,
        toIdx,
    );
    Deno.exit(result);
};

main();
