function fmap<T, R>(array: T[], callback: (item: T, index: number) => R | null | undefined): R[] {
    const r: R[] = [];
    const len = array.length || 0;
    for (let i = 0; i < len; i++) {
        const itemr = callback(array[i], i);
        if (itemr !== undefined && itemr !== null) r.push(itemr);
    }
    return r;
}

export interface LexerSourceInfo {
    sid: number;
    layerSid?: number | undefined;
    expected: string;
    t: string;
    p: number;
    len: number;
    name?: string;
    refName?: string;
    targetName?: string;
    m?: string;
}
export const emptyLexerSourceInfo: LexerSourceInfo = { sid: 0, t: "none", p: 0, len: 0, expected: "UNKNOWN_emptyLexerSourceInfo" };

/**
 *
 */
function lexerLogSuccededOnlyRecursive(item: ParserResult): ParserResult {
    if (!item.succeded || !item.succeded?.length) return item;
    return { ...item, succeded: fmap(item.succeded, (item) => (item.ok ? lexerLogSuccededOnlyRecursive(item) : undefined)) };
}

/**
 *
 */
export function lexerLogSuccededOnly(lexerLog: LexerLog) {
    const items = fmap(lexerLog.succeded, (item) => (item.ok ? lexerLogSuccededOnlyRecursive(item) : undefined));
    return { ...lexerLog, items };
}

/**
 *
 */
function prettyLexerLogRecursive(lexerLog: LexerLog, item: ParserResult): ParserResult {
    const src = lexerLog.sids[item.sid];
    const r: any = { ...item, src, t: src?.t };
    //    if (item?.discarded && item.discarded.length) r.items = fmap(item.discarded, (item) => (item.ok ? prettyLexerLogRecursive(lexerLog, item) : undefined));
    if (item?.succeded && item.succeded.length) r.succeded = fmap(item.succeded, (item) => prettyLexerLogRecursive(lexerLog, item));
    return r;
}

/**
 *
 */
export function prettyLexerLog(lexerLog: LexerLog) {
    const items = fmap(lexerLog.succeded, (item) => (item.ok ? prettyLexerLogRecursive(lexerLog, item) : undefined));
    return { ...lexerLog, items };
}

/**
 *
 */
export function prettyPrintLexerLog(lexerLog: LexerLog, indent: string = "", item?: any) {
    if (!item) {
        for (const item of lexerLog.succeded) {
            prettyPrintLexerLog(lexerLog, "  ", item);
        }
    } else {
        console.log(
            `${indent} ${JSON.stringify(lexerLog.source.substr(item.s, item.e - item.s))} - ${item?.result?.t || "undefined"} parsed by ${
                item.t
            } at ${item.s} ${item.cpl}`,
        );
        if (item?.result?.t && ["identifier", "space", "number"].includes(item.result.t)) {
            return;
        }
        if (item.succeded && item.succeded.length) for (const item2 of item.succeded) prettyPrintLexerLog(lexerLog, indent + "  ", item2);
    }
}

export interface LexerCacheRecord {
    p: number;
    o: any;
}

export interface LexerCacheAtPos {
    //    [key: string]: ParserResult | undefined;
    [key: string]: LexerCacheRecord | undefined;
}

export interface LexerLog {
    lastLogId: number;
    logItem?: any | undefined;
    source: string; // Source file that was parsed by this parse
    sourcePath: string;
    parserSource: string; // Source code of the parser itself
    parserSourcePath: string;
    sids: LexerSourceInfo[];

    discarded: ParserResult[];
    succeded: ParserResult[];
    failed: ParserResult[];
}

export interface ParserResult_allChildrenIn {
    discarded?: ParserResult[] | undefined;
    succeded?: ParserResult[] | undefined;
    failed?: ParserResult[] | undefined;
}
/**
 *
 */
export function ParserResult_allChildren(v: ParserResult_allChildrenIn) {
    return [...(v.discarded || []), ...(v.succeded || []), ...(v.failed || [])];
}

export interface ParserResult {
    // Used and needed
    s: number;
    len?: number;

    // Нужно для передачи значения
    v?: any;

    // Нужно для доменов
    o?: any | undefined;

    //Используется повсеместно, но вероятно можно отказаться
    ok?: boolean | undefined;
    //----------------------------

    // Used, but not actually needed
    id: number;

    // Нужно только для отладки и для сценариев ошибки
    sid: number;
    src?: any | undefined;
    parent?: ParserResult | undefined;
    discarded?: ParserResult[] | undefined; // Discarded children
    succeded?: ParserResult[] | undefined; // Succeded children
    failed?: ParserResult[] | undefined; // Children who caused failure of this ParserResult
    maxP?: number | undefined;
    cpl?: string | undefined; // Не используется
    t?: string | undefined;
}

/**
 *
 */
export function ParserResult_addDiscarded(parserResult: ParserResult, childParserResult: ParserResult) {
    const np = (childParserResult.s || 0) + (childParserResult.len || 0);
    if (!parserResult.maxP || parserResult.maxP < np) parserResult.maxP = np;

    if (parserResult.discarded) parserResult.discarded.push(childParserResult);
    else parserResult.discarded = [childParserResult];
}

/**
 *
 */
export function ParserResult_addSucceded(parserResult: ParserResult, childParserResult: ParserResult) {
    const np = (childParserResult.s || 0) + (childParserResult.len || 0);
    if (!parserResult.maxP || parserResult.maxP < np) parserResult.maxP = np;

    if (parserResult.succeded) parserResult.succeded.push(childParserResult);
    else parserResult.succeded = [childParserResult];
}

/**
 *
 */
export function ParserResult_addFailed(parserResult: ParserResult, childParserResult: ParserResult) {
    const np = (childParserResult.s || 0) + (childParserResult.len || 0);
    if (!parserResult.maxP || parserResult.maxP < np) parserResult.maxP = np;

    if (parserResult.failed) parserResult.failed.push(childParserResult);
    else parserResult.failed = [childParserResult];
}

export interface LexerLike {
    conv: (v: any) => any;
    s: string;
    sourcePath?: string;
    p: number;
    o?: any;
    log?: LexerLog;
    cache: { [key: number]: LexerCacheAtPos };
    parentResult?: ParserResult | undefined;
    lastLogId: number;
}

export interface NewPgLexerInput {
    s: string;
    conv: (v: any) => any;
    o: object;
    sourcePath?: string;
    p?: number;
}

export function newPgLexer(params: NewPgLexerInput): LexerLike {
    return {
        p: 0,
        cache: {},
        lastLogId: 0,
        ...params,
    };
}

//        case "*": return "optMul_";
//         case "+": return "mul_";
//         case "?": return "opt_";
/**
 *
 */
export function parse_StringLiteral(rd: LexerLike, stringLiteral: string, offset: number = 0) {
    if (rd.s.substr(rd.p + offset, stringLiteral.length) !== stringLiteral) return undefined;
    rd.p += stringLiteral.length;
    return true;
}

/**
 *
 */
export function parse_Fixed(rd: LexerLike, length: number, offset: number = 0) {
    if (rd.p + length + offset > rd.s.length) return undefined;
    rd.p += length;
    return true;
}

export function isToken<T = ITokenValueType>(token: any): token is ITokenLike<T> {
    return !token?.tokens && token?.v;
}

/**
 *
 */
export function fillFieldSingle<T extends any>(o: any, fieldName: string, v0: T): T {
    if (v0 === undefined) return v0;
    const v = (v0 as any).v !== undefined ? (v0 as any).v : v0;
    o[fieldName] = v;

    // Keep the tokens if they present
    if (o.tokens) o.tokens[fieldName] = v0;

    return v0;
}

/**
 *
 */
export function fillFieldMulti<T extends any>(o: any, fieldName: string, v0: T): T {
    if (v0 === undefined) return v0;
    const v = (v0 as any).v !== undefined ? (v0 as any).v : v0;

    if (!Array.isArray(o[fieldName])) o[fieldName] = [v];
    else o[fieldName].push(v);

    // Keep the tokens if they present
    if (o.tokens) {
        if (!Array.isArray(o.tokens[fieldName])) o.tokens[fieldName] = [v0];
        else o.tokens[fieldName].push(v0);
    }

    return v0;
}

/**
 *
 */
export function pgParserConv(v: any, convName: string) {
    switch (convName) {
        case "String":
            return v.substr(1, v.length - 2);
        case "Float":
            return Number(v);
        case "Int":
            return Number(v);
        case "Comment":
            return v;
        case "Identifier":
            return v;
        case "Space":
            return v;
    }
    return v;
}

/**
 *
 */
export function pgConv(v: any, convName: string) {
    return pgParserConv(v, convName);
}

/**
 *
 */
export function pgGeneratorConv(v: any, convName: string) {
    switch (convName) {
        case "String":
            return `"${v.replaceAll('"', '\\"').replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\n", "\\n")}"`;
        case "Float":
            return `${v}`;
        case "Int":
            return `${v}`;
        case "Comment":
            return `/*${v}*/`;
        case "Identifier":
            return v;
        case "Space":
            if (!v || !v.length) return " ";
            return v;
    }
    return v;
}

/**
 *
 */
export function revertPosOnFail(rd: LexerLike, oldp: number, cond: any) {
    if (!cond) rd.p = oldp;
    return cond;
}

/**
 *
 */
export function conv(v: any) {
    return v;
}

export interface RdLogInput {
    sid: number;
    src_t: string;
    t?: string;
}
export interface RdLog {
    [key: number]: string[];
}

const rdStartLog: RdLog = {};
const rdSuccessLog: RdLog = {};

/**
 *
 */
export function clearRdLogs() {
    for (const k in rdStartLog) delete rdStartLog[k];
    for (const k in rdSuccessLog) delete rdSuccessLog[k];
}

/**
 *
 */
export function getRdLogs() {
    return { rdStartLog, rdSuccessLog };
}

/**
 *
 */
export function rdLogToStr(rdLog: RdLog) {
    const r: string[] = [];
    for (const k in rdLog) r.push(`${100000 + k} ${rdLog[k].join(", ")}`.substr(1));
    return r.join("\n");
}

/**
 *
 */
export function rdSortKeyOf(a: any) {
    return a.sid;
}

/**
 *
 */
export function addRdLog(rdLog: RdLog, p: number, item: RdLogInput) {
    const s = `${item.src_t} ${item.sid} ${item.t}`;
    if (!rdLog[p]) rdLog[p] = [s];
    else {
        rdLog[p].push(s);
        rdLog[p].sort();
    }
}

/**
 *
 */
export function instr_parserStart(rd: LexerLike, result?: ParserResult) {
    addRdLog(rdStartLog, rd.p, { sid: result?.sid || 0, src_t: result?.src?.t, t: result?.t });
    //console.log(`instr_parserStart t=${result?.t} src.name=${result?.src?.name}`);
}

/**
 *
 */
export function instr_parserEnd(rd: LexerLike, result?: ParserResult) {
    //console.log(`instr_parserEnd t=${result?.t} src.name=${result?.src?.name}`);
    if (result) {
        result.ok = rd.p !== result.s;
    }
    if (result?.ok) addRdLog(rdSuccessLog, rd.p, { sid: result?.sid || 0, src_t: result?.src?.t, t: result?.t });

    // if (rd.log) {
    //     const parentLogItem: ParserResult | undefined = result?.parent;
    //     const id = ++rd.log.lastLogId;
    //     const p = rd.p;
    //     const logItem: ParserResult = { ...logItem0, id, e: p, ok: !!result, result };
    //     if (!parentLogItem) rd.log.items.push(logItem);
    //     else {
    //         if (!parentLogItem.items) parentLogItem.items = [logItem];
    //         else parentLogItem.items.push(logItem);
    //     }
    //     rd.log.logItem = parentLogItem;
    //     const shortLog = {cpl, oldp, p, sid, ok:!!result};
    //     console.log(`CODE00000369 parserLogging ${JSON.stringify(shortLog)}`);
    // }
    //    return result;
}
//
// export function getLayerCached(rd: LexerLike, layerName: string) {
//     if (!rd.cache) rd.cache = {};
//     if (!rd.cache[rd.p]) rd.cache[rd.p] = {};
//     if (rd.cache[rd.p][layerName]) return rd.cache[rd.p][layerName];
//     return undefined;
// }
//
// export function setLayerCached(rd: LexerLike, layerName: string, v: any) {
//     if (!rd.cache) rd.cache = {};
//     if (!rd.cache[rd.p]) rd.cache[rd.p] = {};
//     const r = { v };
//     rd.cache[rd.p][layerName] = r;
//     return r;
// }

// Не получиться так !!!
// Потому что объект должен быть создан ДО того как начнется парсинг cond
// export function createObject(rd: LexerLike, parser: (raw: string) => any, oldp: number, cond: boolean) {
//     const l = rd.p - oldp;
//     if (cond) {
//         const raw = rd.s.substr(oldp, l);
//         const v = parser(raw);
//         rd.o = {tokens:{}};
//         if (!rd.o.tokens) rd.o.tokens = {};
//         rd.o.tokens[fieldName] = { p: oldp, l, v };
//         rd.o[fieldName] = v;
//     }
//     return cond;
// }

export type ITokenValueType = string | number | undefined;

export interface ITokenLike<T = ITokenValueType> {
    //    token_type?: number;
    t?: string;
    p?: number;
    len?: number;
    v: T;
    // line?: number;
    // linep?: number;
}

export interface GeneratorLike {
    lastLogId: number;
    o?: any;
    log?: GenLogItem[];
}

export interface GenLogItem {
    id: string | number;
    cpl: string;
    objId?: string; // Source iobject id
    src?: string; // TODO Также сюда добавить кто родил, почему родил, как родил и т.п
}

export interface NewPgGeneratorInput {
    o: object;
}

export interface PgGenerator extends GeneratorLike {
    o: any;
    log: GenLogItem[];
    genResults: Map<GenResultId, string>;
}

export function newPgGenerator(params: NewPgGeneratorInput): PgGenerator {
    return {
        lastLogId: 0,
        o: params.o,
        log: [],
        genResults: new Map(),
    };
}

//======================================================================================================================
//type TParamKey = "param1" | "param2" | "param3"; // - это список принимаемых параметров

export function isGenResultItemString(v: any): v is string {
    return typeof v === "string";
}
export function isGenResultItemParam(v: any): v is [string] {
    return Array.isArray(v) && v.length === 1;
}

export interface GenResultItemLink {
    linkto: string;
    [key: string]: string;
}
export function isGenResultItemLink(v: any): v is GenResultItemLink {
    return !!v.linkto;
}

export type GenResultItemConv = string;
export type GenResultItem<TParamKey extends string = string> =
    | string
    | ([TParamKey] | [TParamKey, string])
    | { linkto: string; [key: string]: string };

/**
 * GenResult - содержит в items массив из трех видов элементов
 * 'baz'                                - строки-константы
 * ['foo']                              - параметры. При линковке результатов генерации, вместо них будет поставлено значение соответствующее параметру
 * \{linkto:'axe.1', p1:"v1", p2:"v2"\}   - ссылки на другие результаты генерации. При линковке результатов генерации, вместо них подставляются другие результаты генерации
 * Чтобы преобразовать GenResult в строку нужно вызвать linkGenResult
 **/
export interface GenResult<TParamKey extends string = string> {
    id: GenResultId;
    items: GenResultItem<TParamKey>[];
}
export type GenResultId = string | number;

export type GenResultLookupFunc = (path: string) => GenResult;

export interface GenResultLinkerContext {
    s: string;
    lookup?: GenResultLookupFunc;
    compileLink?: (path: string, context: GenResultLinkerContext, params?: any | undefined) => void;
}

export type ID = string | number;
export type Link = {
    to: ID;
    [key: string]: string | number;
};

export type Indent = {
    indent: number;
};
export type Node = {
    id: ID;
    items: Array<string | string[] | Link | Indent>;
};

export type Leaf = {
    [key: string]: string | number | string[] | Leaf | Leaf[];
};

export type Writer = {
    id: ID;
    leaf: Leaf;
};

export type Store = Map<ID, Node>;
export type Handlers = {
    [key: string]: (writer: Writer) => Node;
};

export type Enum = {
    [key: string]: string[];
};

export type Converters = "String" | "Int" | "Float" | "Indentifier";

export type Context = {
    string: string;
    lookup: (id: ID) => Node | undefined;
    converted: {
        [key: string]: Converters;
    };
    beautifySequence?: BeautyRule[];
};

export type ComposeOptions = {
    exclude?: string[];
    converters?: Context["converted"];
    beautifySequence?: BeautyRule[];
};

const charIs = (char: string) =>
    (/[\s]/.test(char) && "Space") ||
    (/['"`]/.test(char) && "Quote") ||
    (/[(\[{]/.test(char) && "PStart") ||
    (/[}\])]/.test(char) && "PEnd") ||
    (/[+\-*&^%$#@!/|:?<>=]/.test(char) && "Special") ||
    (/[a-zA-Z_]/.test(char) && "Letter") ||
    (/[0-9]/.test(char) && "Digit") ||
    (char === "," && "Comma") ||
    "";

export type BeautyLabel = "Space" | "Quote" | "PStart" | "PEnd" | "Special" | "Letter" | "Digit" | "Comma";
export type BeautyRule = `${BeautyLabel}-${BeautyLabel}`;

/**
 * "_a, "_0, "_", "_(,
 * *_0, *_a, *_+, *_(,
 * a_0, a_a, a_",
 * 0_0, 0_a, 0_*,
 * ,_a, ,_0,
 */
const defaultBeautifySequence: BeautyRule[] = [
    "Quote-Letter",
    "Quote-Quote",
    "Quote-Digit",
    "Quote-PStart",
    "Special-Digit",
    "Special-Letter",
    "Special-Special",
    "Special-PStart",
    "Letter-Digit",
    "Letter-Letter",
    "Letter-Quote",
    "Letter-Special",
    "Letter-PStart",
    "Digit-Digit",
    "Digit-Letter",
    "Digit-Special",
    "Digit-PStart",
    "PEnd-Digit",
    "PEnd-Letter",
    "PEnd-PStart",
    "Comma-Letter",
    "Comma-Digit",
];

function beautify(context: Context, item: string) {
    const bs = context.beautifySequence || defaultBeautifySequence;
    if (context.string === undefined) {
        context.string = "";
    }

    const res = item;
    const before = charIs(context.string[context.string.length - 1]);
    const after = charIs(res[0]);

    const sequence = `${before}-${after}` as BeautyRule;

    if (context.string.length > 0 && bs.includes(sequence)) {
        context.string += " ";
    }

    return (context.string += res);
}

const isLink = (target: any): target is Link => !!target.to;

const isIndent = (target: any): target is Indent => !!target.indent;

export function compose(ast: Leaf, generator: Handlers, options?: ComposeOptions) {
    const cleaned = clear(ast, options?.exclude || ["raw", "tokens"]);
    const generated = generate(cleaned, generator);
    const node = generated.values().next().value;

    if (node) {
        const linked = link(
            node,
            {
                string: "",
                lookup: (id) => generated.get(id),
                converted: options?.converters || {
                    string: "String",
                    number: "Float",
                },
                beautifySequence: options?.beautifySequence || defaultBeautifySequence,
            },
            { to: 0 },
        );

        return {
            text: linked.string,
            store: generated,
        };
    } else {
        throw new ReferenceError(`Generated collection got no roots`);
    }
}

export const converters: { [key: string]: Function } = {
    String: (item: string) => `"${item}"`,
    Identifier: (item: string) => item,
    Float: (item: string) => parseFloat(item),
    Int: (item: string) => parseInt(item, 10),
};

export function link(node: Node, context: Context, parent: Link) {
    let indent = 0;

    for (const item of node.items) {
        if (typeof item === "string") {
            beautify(context, item);
        } else if (Array.isArray(item) && item.length) {
            let converter = converters[item[1]];
            if (!converter) {
                converter = converters[context.converted[item[1]]];
            }
            if (converter) {
                beautify(context, converter(parent[item[0]]));
            } else {
                beautify(context, parent[item[0]] + "");
            }
        } else if (typeof item === "object" && !Array.isArray(item)) {
            if (isIndent(item)) {
                indent = item.indent;
            }
            if (isLink(item)) {
                const next = context.lookup(item.to);
                context.string += " ".repeat(indent);
                if (next) {
                    context = link(next, context, item);
                } else {
                    if (typeof item.v === "number" || typeof item.v === "string") {
                        beautify(context, item.v + "");
                    } else {
                        throw new ReferenceError(`Bad link: ${item.to}`);
                    }
                }
            }
        }
    }

    return context;
}

export function generate(target: Leaf, handlers: Handlers, store = new Map<ID, Node>()): Store {
    for (const [key, value] of Object.entries(target)) {
        if (key === "id") {
            if (target.t && typeof target.t === "string" && (typeof value === "string" || typeof value === "number")) {
                const handler = handlers[target.t];
                if (handler) {
                    store.set(value, handler({ id: value, leaf: target }));
                } else {
                    console.log(target.t);
                }
            }
        }
        if (Array.isArray(value)) {
            for (const leaf of value) {
                if (typeof leaf !== "string") {
                    store = generate(leaf, handlers, store);
                }
            }
        }
        if (typeof value === "object" && !Array.isArray(value)) {
            store = generate(value, handlers, store);
        }
    }

    return store;
}

export function clear(target: Leaf, keys: string[] = []) {
    const cleaned = {} as Leaf;
    for (const [key, value] of Object.entries<unknown>(target)) {
        if (!keys.includes(key)) {
            if (Array.isArray(value) && typeof value[0] !== "string") {
                cleaned[key] = value.map((item) => clear(item, keys));
            } else if (value && typeof value === "object" && value.toString() === "[object Object]") {
                cleaned[key] = clear(value as Leaf, keys);
            } else if (Array.isArray(value) && typeof value[0] === "string") {
                cleaned[key] = value;
            } else if (typeof value === "string" || typeof value === "number") {
                cleaned[key] = value;
            }
        }
    }

    return cleaned;
}

export function createLink(item: Leaf) {
    const link = {} as Link;
    for (const [key, value] of Object.entries<any>(item)) {
        if (typeof value === "string" || typeof value === "number") {
            if (key === "t") {
                continue;
            }
            if (key === "id") {
                link.to = value;
                continue;
            }
            link[key] = value;
        }
    }

    return link;
}

export function isLeaf(item: any): item is Leaf {
    return !!(typeof item === "object" && !Array.isArray(item));
}

export function isString(item: any): item is string {
    return typeof item === "string";
}

export function isNumber(item: any): item is number {
    return typeof item === "number";
}

export function isBoolean(item: any): item is boolean {
    return typeof item === "boolean";
}

export function isPrimitive(item: any): item is string | number | boolean {
    return !(isString(item) || isNumber(item) || isBoolean(item));
}

export type GeneratorContext = {
    writer: Writer;
    input: Leaf;
    output: Node["items"];
    generator: Handlers;
};

export const GEN = {
    enumSwitch(flag: string, e: Enum, { output }: GeneratorContext) {
        output.push(e[flag][0]);
    },

    typeSwitch(item: any, field: string, choice: string[], { writer, input, output, generator }: GeneratorContext) {
        // if item is Literal and his value is zero
        if (item || item === 0) {
            const type = item.t;
            if (isString(type) && choice.includes(type)) {
                output.push(createLink(item));
            } else if (isString(input.t)) {
                output.push([field, input.t]);
            }
        } else {
            const type = input.t;
            if (isString(type) && choice.includes(type)) {
                return generator[type](writer);
            }
        }
    },

    plusField(field: string | undefined, { input, output }: GeneratorContext, callback: (item: Leaf) => void, seporator?: () => void) {
        if (field) {
            const items = input[field];
            if (Array.isArray(items) && items.length) {
                for (const [i, item] of items.entries()) {
                    if (isLeaf(item)) {
                        callback(item);
                    } else {
                        output.push(item);
                    }
                    if (seporator && items.length > 1 && i < items.length - 1) {
                        seporator();
                    }
                }
            }
        }
    },

    reference(item: any, field: string, converter: string, { input, output }: GeneratorContext) {
        if (item) {
            if (isLeaf(item)) {
                output.push(createLink(item));
            } else if (isString(item)) {
                if (converter) {
                    output.push([field, converter]);
                } else {
                    output.push([field, "ref"]);
                }
            }
        }
    },
};
