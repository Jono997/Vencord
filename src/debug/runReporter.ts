/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { SYM_PROXY_INNER_GET, SYM_PROXY_INNER_VALUE } from "@utils/proxyInner";
import * as Webpack from "@webpack";
import { patches } from "plugins";

import { loadLazyChunks } from "./loadLazyChunks";


const ReporterLogger = new Logger("Reporter");

async function runReporter() {
    try {
        ReporterLogger.log("Starting test...");

        let loadLazyChunksResolve: (value: void | PromiseLike<void>) => void;
        const loadLazyChunksDone = new Promise<void>(r => loadLazyChunksResolve = r);

        Webpack.beforeInitListeners.add(() => loadLazyChunks().then(() => loadLazyChunksResolve()));
        await loadLazyChunksDone;

        for (const patch of patches) {
            if (!patch.all) {
                new Logger("WebpackInterceptor").warn(`Patch by ${patch.plugin} found no module (Module id is -): ${patch.find}`);
            }
        }

        await Promise.all(Webpack.webpackSearchHistory.map(async ([searchType, args]) => {
            args = [...args];

            try {
                let result = null as any;

                switch (searchType) {
                    case "webpackDependantLazy":
                    case "webpackDependantLazyComponent": {
                        const [factory] = args;
                        result = factory();
                        break;
                    }
                    case "extractAndLoadChunks": {
                        const [code, matcher] = args;

                        result = await Webpack.extractAndLoadChunks(code, matcher);
                        if (result === false) {
                            result = null;
                        }

                        break;
                    }
                    default: {
                        const findResult = args.shift();

                        if (findResult != null) {
                            if (findResult.$$vencordCallbackCalled != null && findResult.$$vencordCallbackCalled()) {
                                result = findResult;
                            }

                            if (findResult[SYM_PROXY_INNER_GET] != null) {
                                result = findResult[SYM_PROXY_INNER_VALUE];
                            }

                            if (findResult.$$vencordInner != null) {
                                result = findResult.$$vencordInner();
                            }
                        }

                        break;
                    }
                }

                if (result == null) {
                    throw "a rock at ben shapiro";
                }
            } catch (e) {
                let logMessage = searchType;

                let filterName = "";
                let parsedArgs = args;

                if (args[0].$$vencordProps != null) {
                    if (["find", "findComponent", "waitFor"].includes(searchType)) {
                        filterName = args[0].$$vencordProps[0];
                    }

                    parsedArgs = args[0].$$vencordProps.slice(1);
                }

                // if parsedArgs is the same as args, it means vencordProps of the filter was not available (like in normal filter functions),
                // so log the filter function instead
                if (
                    parsedArgs === args &&
                    ["waitFor", "find", "findComponent", "webpackDependantLazy", "webpackDependantLazyComponent"].includes(searchType)
                ) {
                    let filter = parsedArgs[0].toString();
                    if (filter.length > 150) {
                        filter = filter.slice(0, 147) + "...";
                    }

                    logMessage += `(${filter})`;
                } else if (searchType === "extractAndLoadChunks") {
                    let regexStr: string;
                    if (parsedArgs[1] === Webpack.DefaultExtractAndLoadChunksRegex) {
                        regexStr = "DefaultExtractAndLoadChunksRegex";
                    } else {
                        regexStr = parsedArgs[1].toString();
                    }

                    logMessage += `([${parsedArgs[0].map((arg: any) => `"${arg}"`).join(", ")}], ${regexStr})`;
                } else {
                    logMessage += `(${filterName.length ? `${filterName}(` : ""}${parsedArgs.map(arg => `"${arg}"`).join(", ")})${filterName.length ? ")" : ""}`;
                }

                ReporterLogger.log("Webpack Find Fail:", logMessage);
            }
        }));

        ReporterLogger.log("Finished test");
    } catch (e) {
        ReporterLogger.log("A fatal error occurred:", e);
    }
}

runReporter();