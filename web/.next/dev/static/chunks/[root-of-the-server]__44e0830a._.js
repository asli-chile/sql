(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime-types.d.ts" />
/// <reference path="../../runtime/base/dev-globals.d.ts" />
/// <reference path="../../runtime/base/dev-protocol.d.ts" />
/// <reference path="../../runtime/base/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
/**
 * Header / Navbar principal de ASLI
 * Estilo limpio, fondo blanco, navegación clara
 */ const Header = ()=>{
    _s();
    const [isMenuOpen, setIsMenuOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [dolarObservado, setDolarObservado] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loadingDolar, setLoadingDolar] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const handleToggleMenu = ()=>{
        setIsMenuOpen(!isMenuOpen);
    };
    const handleCloseMenu = ()=>{
        setIsMenuOpen(false);
    };
    const handleKeyDown = (event)=>{
        if (event.key === 'Enter' || event.key === ' ') {
            handleToggleMenu();
        }
        if (event.key === 'Escape' && isMenuOpen) {
            handleCloseMenu();
        }
    };
    // Prevenir scroll del body cuando el menú está abierto
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Header.useEffect": ()=>{
            if (isMenuOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = 'unset';
            }
            return ({
                "Header.useEffect": ()=>{
                    document.body.style.overflow = 'unset';
                }
            })["Header.useEffect"];
        }
    }["Header.useEffect"], [
        isMenuOpen
    ]);
    // Obtener el valor del dólar observado
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Header.useEffect": ()=>{
            const fetchDolarObservado = {
                "Header.useEffect.fetchDolarObservado": async ()=>{
                    try {
                        setLoadingDolar(true);
                        // Usar la API de mindicador.cl para obtener el dólar observado
                        const response = await fetch('https://mindicador.cl/api/dolar');
                        const data = await response.json();
                        if (data && data.valor) {
                            // El valor más reciente está en data.valor
                            setDolarObservado({
                                valor: data.valor,
                                fecha: data.fecha
                            });
                        } else if (data && data.serie && data.serie.length > 0) {
                            // Fallback: usar el primer valor de la serie si existe
                            const valorMasReciente = data.serie[0];
                            setDolarObservado({
                                valor: valorMasReciente.valor,
                                fecha: valorMasReciente.fecha
                            });
                        }
                    } catch (error) {
                        console.error('Error al obtener el dólar observado:', error);
                    } finally{
                        setLoadingDolar(false);
                    }
                }
            }["Header.useEffect.fetchDolarObservado"];
            fetchDolarObservado();
        }
    }["Header.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "bg-asli-dark shadow-lg sticky top-0 z-50 relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                className: "container mx-auto px-4 sm:px-6 lg:px-8",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-3 items-center h-20",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex-shrink-0",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/",
                                className: "flex items-center space-x-3",
                                "aria-label": "ASLI - Inicio",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: "/img/logoblanco.png",
                                        alt: "ASLI Logo",
                                        className: "h-10 md:h-12 object-contain"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 85,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                        src: "/img/logopro.png",
                                        alt: "ASLI Pro Logo",
                                        className: "h-10 md:h-12 object-contain"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 90,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 80,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                            lineNumber: 79,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-center items-center",
                            children: loadingDolar ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-white text-sm md:text-base animate-pulse",
                                children: "Cargando..."
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 101,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)) : dolarObservado ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-white text-xs md:text-sm font-medium hidden sm:block",
                                        children: "Dólar Observado"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 106,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-white text-sm md:text-base lg:text-lg font-bold",
                                        children: [
                                            "$",
                                            dolarObservado.valor.toLocaleString('es-CL', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2
                                            })
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 109,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    dolarObservado.fecha && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-white text-xs opacity-80 mt-0.5",
                                        children: new Date(dolarObservado.fecha).toLocaleDateString('es-CL', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 116,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 105,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-white text-xs md:text-sm opacity-70",
                                children: "No disponible"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 126,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                            lineNumber: 99,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-end",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                className: "p-2 rounded-md text-white hover:text-asli-primary focus:outline-none focus:ring-2 focus:ring-asli-primary",
                                onClick: handleToggleMenu,
                                onKeyDown: handleKeyDown,
                                "aria-label": isMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación',
                                "aria-expanded": isMenuOpen,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                    className: "h-6 w-6",
                                    fill: "none",
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    strokeWidth: "2",
                                    viewBox: "0 0 24 24",
                                    stroke: "currentColor",
                                    children: isMenuOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M6 18L18 6M6 6l12 12"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 152,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        d: "M4 6h16M4 12h16M4 18h16"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 154,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                    lineNumber: 142,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 134,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                            lineNumber: 133,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                    lineNumber: 77,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                lineNumber: 76,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            isMenuOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-30 transition-opacity duration-300",
                onClick: handleCloseMenu,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                lineNumber: 164,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `fixed top-20 left-0 right-0 bg-asli-dark border-t border-gray-700 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`,
                style: {
                    maxHeight: 'calc(100vh - 5rem)',
                    overflowY: 'auto'
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto px-4 sm:px-6 lg:px-8 py-6",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "#inicio",
                                className: "text-white hover:text-asli-primary transition-colors duration-200 font-medium py-2",
                                onClick: handleCloseMenu,
                                children: "INICIO"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 180,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/servicios",
                                className: "text-white hover:text-asli-primary transition-colors duration-200 font-medium py-2",
                                onClick: handleCloseMenu,
                                children: "SERVICIOS"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 187,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/tracking",
                                className: "text-white hover:text-asli-primary transition-colors duration-200 font-medium py-2",
                                onClick: handleCloseMenu,
                                children: "TRACKING"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 194,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                href: "/presentacion",
                                className: "text-white hover:text-asli-primary transition-colors duration-200 font-medium py-2",
                                onClick: handleCloseMenu,
                                children: "PRESENTACIÓN"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 201,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center space-x-3 mt-6 pt-6 border-t border-gray-700",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "https://www.instagram.com/asli_chile",
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        className: "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200",
                                        "aria-label": "Instagram",
                                        onClick: handleCloseMenu,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-5 h-5 text-white",
                                            fill: "currentColor",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                                lineNumber: 219,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                            lineNumber: 218,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 210,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "https://www.linkedin.com/company/aslichile/posts/?feedView=all",
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        className: "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200",
                                        "aria-label": "LinkedIn",
                                        onClick: handleCloseMenu,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-5 h-5 text-white",
                                            fill: "currentColor",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                                lineNumber: 231,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                            lineNumber: 230,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 222,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                        href: "https://api.whatsapp.com/send/?phone=56968394225&text&type=phone_number&app_absent=0",
                                        target: "_blank",
                                        rel: "noopener noreferrer",
                                        className: "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200",
                                        "aria-label": "WhatsApp",
                                        onClick: handleCloseMenu,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-5 h-5 text-white",
                                            fill: "currentColor",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                                lineNumber: 243,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                            lineNumber: 242,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                        lineNumber: 234,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                                lineNumber: 209,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                        lineNumber: 179,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                    lineNumber: 178,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
                lineNumber: 172,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx",
        lineNumber: 75,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(Header, "YaXTBOa5saaS0QMqQaehpE6tjdI=");
_c = Header;
const __TURBOPACK__default__export__ = Header;
var _c;
__turbopack_context__.k.register(_c, "Header");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Hero principal de la Home
 * Imagen de barco de fondo, texto sobre panel oscuro
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const Hero = ()=>{
    const handleAccederApp = ()=>{
        // Detectar si estamos en desarrollo local
        if ("TURBOPACK compile-time truthy", 1) {
            const hostname = window.location.hostname;
            const currentPort = window.location.port || '3000';
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
            if (isLocal) {
                // El ERP está en el puerto 3001 (la página principal está en 3000)
                const erpUrl = 'http://localhost:3001';
                console.log('🔄 Redirigiendo a la aplicación ERP:', erpUrl);
                // Usar replace para evitar que el botón "atrás" regrese a esta página
                window.location.replace(erpUrl);
            } else {
                // En producción, usar la ruta relativa /auth que será manejada por rewrites
                // Esto mantendrá el dominio asli.cl y redirigirá a la ERP vía rewrites
                window.location.href = '/auth';
                // Fallback: si no funciona, redirigir directamente
                setTimeout(()=>{
                    if (window.location.pathname !== '/auth') {
                        window.location.href = '/auth';
                    }
                }, 100);
            }
        }
    };
    const handleServiciosClick = ()=>{
        document.getElementById('servicios')?.scrollIntoView({
            behavior: 'smooth'
        });
    };
    const handleContactoClick = ()=>{
        document.getElementById('contacto')?.scrollIntoView({
            behavior: 'smooth'
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "inicio",
        className: "relative min-h-[90vh] flex items-center justify-start bg-cover bg-center bg-no-repeat",
        style: {
            backgroundImage: `url('/img/HERO.webp')`
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 bg-gradient-to-t from-asli-dark via-asli-dark/70 to-transparent"
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                lineNumber: 55,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-2xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-6 flex justify-center md:justify-start",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: "/img/logoblanco.png",
                                alt: "ASLI Logo",
                                className: "h-24 md:h-[120px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]",
                                style: {
                                    filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.9)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.7))'
                                }
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                lineNumber: 62,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                            lineNumber: 61,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-center md:text-left text-white/80 text-sm md:text-base mb-4 uppercase tracking-wide",
                            children: "Logística y Comercio Exterior"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                            lineNumber: 71,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-asli-dark/80 backdrop-blur-sm p-8 md:p-12 rounded-lg",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight",
                                    children: "DEL ORIGEN AL DESTINO ASLI ESTÁ EN CADA PASO"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                    lineNumber: 76,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white text-lg mb-8 leading-relaxed",
                                    children: [
                                        "Asesorías y Servicios Logísticos Integrales Ltda.",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("br", {}, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                            lineNumber: 81,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        "Fundada en 2021 en Curicó, Región del Maule."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                    lineNumber: 79,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col sm:flex-row gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleServiciosClick,
                                            className: "bg-asli-primary text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg",
                                            "aria-label": "Ver nuestros servicios",
                                            children: "NUESTROS SERVICIOS"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                            lineNumber: 85,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleContactoClick,
                                            className: "bg-transparent text-white border-2 border-asli-primary px-8 py-3 rounded-md text-lg font-semibold hover:bg-asli-primary transition-all duration-200",
                                            "aria-label": "Contactarnos",
                                            children: "CONTACTANOS"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                            lineNumber: 93,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleAccederApp,
                                            className: "bg-asli-accent text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg text-center cursor-pointer",
                                            "aria-label": "Ir a la aplicación ERP",
                                            children: "ACCEDER A LA APP"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                            lineNumber: 101,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                                    lineNumber: 84,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                            lineNumber: 75,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                    lineNumber: 59,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                lineNumber: 58,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    className: "w-8 h-8 text-white",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2,
                        d: "M19 14l-7 7m0 0l-7-7m7 7V3"
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                        lineNumber: 122,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                    lineNumber: 116,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
                lineNumber: 115,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx",
        lineNumber: 47,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Hero;
const __TURBOPACK__default__export__ = Hero;
var _c;
__turbopack_context__.k.register(_c, "Hero");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: QUIÉNES SOMOS
 * Fondo oscuro, cards con información institucional
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const QuienesSomos = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "quienes-somos",
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "QUIÉNES SOMOS"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                            lineNumber: 10,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90 mb-8",
                            children: "Tu Mejor Opción en Logística Integral"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                            lineNumber: 13,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed",
                            children: "Somos una empresa especializada en servicios logísticos integrales, con un enfoque profesional y comprometido con la excelencia. Desde nuestra fundación en 2021, hemos construido una red sólida de alianzas estratégicas que nos permite ofrecer soluciones completas y eficientes para nuestros clientes."
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                            lineNumber: 16,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                    lineNumber: 9,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-asli-secondary/50 rounded-lg p-6 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                        className: "w-16 h-16 mx-auto text-asli-primary",
                                        fill: "none",
                                        stroke: "currentColor",
                                        viewBox: "0 0 24 24",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            strokeLinecap: "round",
                                            strokeLinejoin: "round",
                                            strokeWidth: 2,
                                            d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                            lineNumber: 35,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                        lineNumber: 29,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 28,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-xl font-bold text-white mb-3",
                                    children: "Red de Alianzas Estratégicas"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 43,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-gray-300",
                                    children: "Colaboramos con los mejores proveedores y socios estratégicos del sector logístico para garantizar servicios de calidad."
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 46,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                            lineNumber: 27,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-asli-secondary/50 rounded-lg p-6 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-6xl font-bold text-asli-primary",
                                        children: "2021"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                        lineNumber: 55,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 54,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-xl font-bold text-white mb-3",
                                    children: "Año de Fundación"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 57,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-gray-300",
                                    children: "Fundada en Curicó, Región del Maule, con la visión de ser líderes en servicios logísticos integrales."
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 60,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                            lineNumber: 53,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-asli-secondary/50 rounded-lg p-6 text-center",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-6xl font-bold text-asli-primary",
                                        children: "100"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                        lineNumber: 69,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 68,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-xl font-bold text-white mb-3",
                                    children: "% Satisfacción"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 71,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-gray-300",
                                    children: "Comprometidos con la excelencia y la satisfacción total de nuestros clientes en cada operación."
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                                    lineNumber: 72,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                            lineNumber: 67,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                    lineNumber: 25,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-12 flex justify-center",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "w-full md:w-2/3 lg:w-1/2 max-w-4xl",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-cover bg-center bg-no-repeat rounded-lg aspect-video",
                            style: {
                                backgroundImage: 'url(/img/edificio.webp)'
                            }
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                            lineNumber: 82,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                        lineNumber: 81,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
                    lineNumber: 80,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
            lineNumber: 8,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx",
        lineNumber: 7,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = QuienesSomos;
const __TURBOPACK__default__export__ = QuienesSomos;
var _c;
__turbopack_context__.k.register(_c, "QuienesSomos");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: Nuestra historia
 * Historia de ASLI y su fundación
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const NuestraHistoria = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "max-w-4xl mx-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center mb-12",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "NUESTRA HISTORIA"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                            lineNumber: 11,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                        lineNumber: 10,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-6 text-gray-300 leading-relaxed",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg",
                                children: [
                                    "ASLI nace a partir de la experiencia y convicción de su Gerente General, ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                        className: "text-white",
                                        children: "Mario Basaez"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                                        lineNumber: 19,
                                        columnNumber: 24
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    ", profesional formado en el corazón de la industria exportadora chilena. Durante años de trabajo en Copefrut, una de las empresas más grandes y consolidadas del sector, Mario fue testigo directo del alto nivel de exigencia, coordinación y precisión que requiere una operación logística de exportación exitosa."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                                lineNumber: 17,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg",
                                children: "Sin embargo, esa misma experiencia le permitió identificar una realidad que se repetía con frecuencia: para los pequeños y medianos exportadores, la logística se transformaba muchas veces en la principal barrera para crecer, profesionalizarse y competir en igualdad de condiciones. Procesos complejos, falta de acompañamiento técnico, decisiones críticas tomadas sin asesoría adecuada y una relación distante con los distintos actores de la cadena logística terminaban afectando costos, tiempos y, en muchos casos, la continuidad de las operaciones."
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                                lineNumber: 27,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg",
                                children: "Con esa inquietud como motor, surge la visión de crear una empresa distinta. Una empresa cercana, experta y comprometida, que no solo ofreciera servicios logísticos, sino que acompañara a sus clientes en cada etapa del proceso, entregando asesoría real, honesta y estratégica."
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                                lineNumber: 38,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg",
                                children: "Así nace ASLI – Asesorias y Servicios Logísticos Integrales, con un propósito claro: asesorar, acompañar y respaldar a los pequeños y medianos exportadores, ayudándolos a operar con el mismo estándar, orden y profesionalismo que las grandes compañías, pero con un trato personalizado y flexible."
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                                lineNumber: 45,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg",
                                children: "Hoy, ASLI se posiciona como un socio estratégico para sus clientes, integrando conocimiento operativo, experiencia en comercio exterior y una visión humana de la logística, entendiendo que detrás de cada carga hay un negocio, un proyecto y personas que confían en que su mercancía llegará a destino de forma segura y eficiente."
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                                lineNumber: 53,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                        lineNumber: 16,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
                lineNumber: 9,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
            lineNumber: 8,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx",
        lineNumber: 7,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = NuestraHistoria;
const __TURBOPACK__default__export__ = NuestraHistoria;
var _c;
__turbopack_context__.k.register(_c, "NuestraHistoria");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: NUESTROS SERVICIOS
 * Grid 3x3 con 9 servicios, fondo oscuro
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const Servicios = ()=>{
    const servicios = [
        {
            id: 1,
            titulo: 'Asesoría En Exportaciones',
            descripcion: 'Gestión completa del proceso de exportación, desde la documentación hasta la coordinación con navieras y aduanas.'
        },
        {
            id: 2,
            titulo: 'Asesoría En Importaciones',
            descripcion: 'Facilitamos la importación de tus productos, manejando trámites aduaneros y coordinación logística.'
        },
        {
            id: 3,
            titulo: 'Asesoría Documental',
            descripcion: 'Asesoría especializada en documentación aduanera, certificados, permisos y toda la tramitación necesaria.'
        },
        {
            id: 4,
            titulo: 'Transporte Marítimo',
            descripcion: 'Coordinación con las principales navieras del mundo para el transporte seguro de tu carga.'
        },
        {
            id: 5,
            titulo: 'Transporte Aéreo',
            descripcion: 'Soluciones de transporte aéreo para cargas urgentes o de alto valor.'
        },
        {
            id: 6,
            titulo: 'Transporte Terrestre',
            descripcion: 'Red de transporte terrestre confiable para mover tu carga desde y hacia puertos y aeropuertos.'
        },
        {
            id: 7,
            titulo: 'Gestión de Contenedores',
            descripcion: 'Administración eficiente de contenedores, optimizando espacio y costos.'
        },
        {
            id: 8,
            titulo: 'Servicios Aduaneros',
            descripcion: 'Tramitación aduanera completa, cumplimiento normativo y agilización de procesos.'
        },
        {
            id: 9,
            titulo: 'Asesoría Logística Integral',
            descripcion: 'Soluciones logísticas completas y personalizadas para cada necesidad de tu empresa.'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "servicios",
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "NUESTROS SERVICIOS"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                            lineNumber: 67,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90",
                            children: "Soluciones logísticas integrales y especializadas"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                            lineNumber: 70,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                    lineNumber: 66,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8",
                    children: servicios.map((servicio)=>{
                        // Definir imágenes de fondo para todos los servicios
                        const imagenesFondo = {
                            1: '/img/expo.webp',
                            2: '/img/impo.webp',
                            3: '/img/docs.webp',
                            4: '/img/maritimo.webp',
                            5: '/img/aereo.webp',
                            6: '/img/camion.webp',
                            7: '/img/container.webp',
                            8: '/img/aduana.webp',
                            9: '/img/logistica.webp'
                        };
                        const tieneImagenFondo = imagenesFondo[servicio.id];
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: `group rounded-lg p-4 sm:p-6 transition-all duration-300 ease-in-out relative overflow-hidden w-full transform hover:scale-105 ${tieneImagenFondo ? 'bg-cover bg-center bg-no-repeat' : 'bg-asli-secondary/50 hover:bg-asli-secondary/70'}`,
                            style: {
                                minHeight: '240px',
                                height: 'auto',
                                ...tieneImagenFondo && {
                                    backgroundImage: `url(${imagenesFondo[servicio.id]})`,
                                    minHeight: '240px'
                                }
                            },
                            children: [
                                tieneImagenFondo && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute inset-0 bg-asli-dark/70 group-hover:bg-asli-dark/85 rounded-lg transition-all duration-300"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                                    lineNumber: 110,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-4 relative z-10",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: `w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${tieneImagenFondo ? 'bg-asli-primary/30' : 'bg-asli-primary/20'}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                                            className: "w-8 h-8 text-asli-primary",
                                            fill: "none",
                                            stroke: "currentColor",
                                            viewBox: "0 0 24 24",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                strokeLinecap: "round",
                                                strokeLinejoin: "round",
                                                strokeWidth: 2,
                                                d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                                                lineNumber: 122,
                                                columnNumber: 23
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                                            lineNumber: 116,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                                        lineNumber: 113,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                                    lineNumber: 112,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: `text-xl font-semibold mb-3 relative z-10 ${tieneImagenFondo ? 'text-white drop-shadow-lg' : 'text-white'}`,
                                    children: servicio.titulo
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                                    lineNumber: 131,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: `leading-relaxed relative z-10 ${tieneImagenFondo ? 'text-white drop-shadow-md' : 'text-gray-300'}`,
                                    children: servicio.descripcion
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                                    lineNumber: 136,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, servicio.id, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                            lineNumber: 92,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0));
                    })
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
                    lineNumber: 75,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
            lineNumber: 65,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx",
        lineNumber: 64,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Servicios;
const __TURBOPACK__default__export__ = Servicios;
var _c;
__turbopack_context__.k.register(_c, "Servicios");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: NUESTRO EQUIPO
 * Grid con fotos y nombres del equipo
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const NuestroEquipo = ()=>{
    // Estructura del equipo - Orden de 3 en 3
    const nivelSuperior = [
        {
            nombre: 'Mario Basaez',
            cargo: 'Fundador y Gerente General',
            imagen: '/img/mariobasaez.png'
        },
        {
            nombre: 'Hans Vasquez',
            cargo: 'Subgerente de Operaciones',
            imagen: '/img/hansv.png'
        },
        {
            nombre: 'Poliana Cisternas',
            cargo: 'Subgerente Comercial',
            imagen: '/img/poli.jpg'
        }
    ];
    const nivelMedio = [
        {
            nombre: 'Rocio Villareal',
            cargo: 'Subgerente de Seguridad Alimentaria',
            imagen: '/img/rocio.png'
        },
        {
            nombre: 'Ricardo Lazo',
            cargo: 'Subgerente Comercio Exterior',
            imagen: '/img/ricardolazo.png'
        },
        {
            nombre: 'Nina Scotti',
            cargo: 'Ejecutiva Comercial e Importaciones',
            imagen: '/img/nina.png'
        }
    ];
    const nivelInferior = [
        {
            nombre: 'Alex Cárdenas',
            cargo: 'Coordinador de Transportes',
            imagen: '/img/alex.png'
        },
        {
            nombre: 'Stefania Cordova',
            cargo: 'Subgerente de Administración y Finanzas',
            imagen: '/img/stefanie.png'
        },
        {
            nombre: 'Rodrigo Cáceres',
            cargo: 'Customer Services',
            imagen: '/img/rodrigo.png'
        }
    ];
    const MiembroCard = ({ miembro })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center group",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mb-4 relative inline-block",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        src: miembro.imagen,
                        alt: miembro.nombre,
                        className: "w-32 h-32 rounded-full mx-auto object-cover border-4 border-asli-primary transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,122,123,0.6)] group-hover:shadow-asli-primary"
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                        lineNumber: 64,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                    lineNumber: 63,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                    className: "text-lg font-semibold text-white mb-1",
                    children: miembro.nombre
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                    lineNumber: 70,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-gray-300",
                    children: miembro.cargo
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                    lineNumber: 73,
                    columnNumber: 7
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
            lineNumber: 62,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "equipo",
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "NUESTRO EQUIPO"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                            lineNumber: 81,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90",
                            children: "Profesionales comprometidos con tu éxito"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                            lineNumber: 84,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                    lineNumber: 80,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col items-center gap-8 lg:gap-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap justify-center gap-6 lg:gap-12",
                            children: nivelSuperior.map((miembro, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MiembroCard, {
                                    miembro: miembro
                                }, index, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                                    lineNumber: 94,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                            lineNumber: 92,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap justify-center gap-6 lg:gap-8",
                            children: nivelMedio.map((miembro, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MiembroCard, {
                                    miembro: miembro
                                }, index, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                                    lineNumber: 101,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                            lineNumber: 99,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap justify-center gap-6 lg:gap-8",
                            children: nivelInferior.map((miembro, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MiembroCard, {
                                    miembro: miembro
                                }, index, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                                    lineNumber: 108,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0)))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                            lineNumber: 106,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
                    lineNumber: 90,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
            lineNumber: 79,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx",
        lineNumber: 78,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = NuestroEquipo;
const __TURBOPACK__default__export__ = NuestroEquipo;
var _c;
__turbopack_context__.k.register(_c, "NuestroEquipo");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: ASESORÍA Y COORDINACIÓN INTEGRAL EN COMERCIO INTERNACIONAL
 * Especialización en fruta fresca y congelada
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const AsesoriaComercioInternacional = ()=>{
    const caracteristicas = [
        {
            titulo: 'Asesoría Integral en todo momento',
            icono: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "w-6 h-6",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                    lineNumber: 11,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                lineNumber: 10,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        },
        {
            titulo: 'Coordinación con Proveedores',
            icono: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "w-6 h-6",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                    lineNumber: 19,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                lineNumber: 18,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        },
        {
            titulo: 'Guía en Certificación OEA',
            icono: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "w-6 h-6",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                    lineNumber: 27,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                lineNumber: 26,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        },
        {
            titulo: 'Cumplimiento de Normativas',
            icono: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                className: "w-6 h-6",
                fill: "none",
                stroke: "currentColor",
                viewBox: "0 0 24 24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    strokeWidth: 2,
                    d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                    lineNumber: 35,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                lineNumber: 34,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4",
                            children: "ASESORÍA Y COORDINACIÓN INTEGRAL EN COMERCIO INTERNACIONAL"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                            lineNumber: 45,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90 max-w-3xl mx-auto",
                            children: "Te acompañamos en cada etapa del proceso: packaging, logística, documentación y certificaciones."
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                            lineNumber: 48,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                    lineNumber: 44,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-4xl mx-auto text-center space-y-8",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-2xl md:text-3xl font-bold text-white",
                                        children: "Asesoría y Coordinación en Importación y Exportación"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                        lineNumber: 58,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-24 h-1 bg-asli-primary rounded-full mx-auto mt-3"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                        lineNumber: 61,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                lineNumber: 57,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-gray-300 mb-8 leading-relaxed text-lg max-w-3xl mx-auto",
                                children: "Especializados en logística de fruta fresca y congelada, ofrecemos un acompañamiento completo desde el origen hasta el destino. Nuestro equipo experto gestiona todos los aspectos de tu operación internacional, asegurando el cumplimiento de normativas, certificaciones y estándares de calidad."
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                lineNumber: 63,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto",
                                children: caracteristicas.map((caracteristica, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "group flex items-start space-x-3 bg-asli-secondary/30 p-4 rounded-lg hover:bg-asli-secondary/50 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-asli-primary/30 border border-transparent hover:border-asli-primary/30",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-asli-accent flex-shrink-0 mt-1 transition-transform duration-300 group-hover:scale-110 group-hover:text-asli-primary",
                                                children: caracteristica.icono
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                                lineNumber: 77,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-white text-sm font-medium group-hover:text-asli-light",
                                                children: caracteristica.titulo
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                                lineNumber: 80,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, index, true, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                        lineNumber: 73,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                                lineNumber: 71,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                        lineNumber: 56,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
                    lineNumber: 55,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
            lineNumber: 43,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx",
        lineNumber: 42,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = AsesoriaComercioInternacional;
const __TURBOPACK__default__export__ = AsesoriaComercioInternacional;
var _c;
__turbopack_context__.k.register(_c, "AsesoriaComercioInternacional");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: NUESTROS PRINCIPALES CLIENTES
 * Grid con logos de clientes
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const ClientesPrincipales = ()=>{
    // Logos de clientes principales
    const clientes = [
        {
            id: 1,
            nombre: 'Alma',
            logo: '/img/alma.png'
        },
        {
            id: 2,
            nombre: 'Cope',
            logo: '/img/cope.png'
        },
        {
            id: 3,
            nombre: 'Hillvilla',
            logo: '/img/hillvilla.png'
        },
        {
            id: 4,
            nombre: 'Xsur',
            logo: '/img/xsur.png'
        },
        {
            id: 5,
            nombre: 'Jotrisa',
            logo: '/img/jotrisa.png'
        },
        {
            id: 6,
            nombre: 'San Andrés',
            logo: '/img/san-andres.png'
        },
        {
            id: 7,
            nombre: 'Rino',
            logo: '/img/rino.png'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "NUESTROS PRINCIPALES CLIENTES"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90",
                            children: "Colaboramos con las mejores empresas del sector"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
                            lineNumber: 52,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
                    lineNumber: 48,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8 max-w-5xl mx-auto",
                    children: clientes.map((cliente)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white/5 rounded-lg p-6 flex items-center justify-center hover:bg-white/10 transition-all duration-200",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: cliente.logo,
                                alt: cliente.nombre,
                                className: "max-w-full h-16 object-contain"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
                                lineNumber: 63,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, cliente.id, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
                            lineNumber: 59,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
                    lineNumber: 57,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
            lineNumber: 47,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx",
        lineNumber: 46,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = ClientesPrincipales;
const __TURBOPACK__default__export__ = ClientesPrincipales;
var _c;
__turbopack_context__.k.register(_c, "ClientesPrincipales");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: SOMOS PARTE DE
 * Aliados estratégicos y partners
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const SomosParteDe = ()=>{
    // Logos de partners y alianzas estratégicas
    const partners = [
        {
            id: 1,
            nombre: 'Agronexo',
            logo: '/img/agronexo.png'
        },
        {
            id: 2,
            nombre: 'Fedefruta',
            logo: '/img/fedefruta.png'
        },
        {
            id: 3,
            nombre: 'Maulealimenta',
            logo: '/img/maulealimenta.png'
        },
        {
            id: 4,
            nombre: 'ProChile',
            logo: '/img/prochile2.png'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "socios",
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "SOMOS PARTE DE"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
                            lineNumber: 34,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90 max-w-3xl mx-auto",
                            children: "Respaldados por alianzas estratégicas con líderes de la industria logística global"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
                            lineNumber: 37,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
                    lineNumber: 33,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 max-w-4xl mx-auto",
                    children: partners.map((partner)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white/5 rounded-lg p-6 flex items-center justify-center hover:bg-white/10 transition-all duration-200",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: partner.logo,
                                alt: partner.nombre,
                                className: "max-w-full h-16 object-contain"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
                                lineNumber: 49,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, partner.id, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
                            lineNumber: 45,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
                    lineNumber: 43,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
            lineNumber: 32,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx",
        lineNumber: 31,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = SomosParteDe;
const __TURBOPACK__default__export__ = SomosParteDe;
var _c;
__turbopack_context__.k.register(_c, "SomosParteDe");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: NAVIERAS Y AEROLÍNEAS
 * Logos de las principales navieras y aerolíneas con las que trabajan
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const NavierasPrincipales = ()=>{
    const navieras = [
        {
            nombre: 'Avianca',
            logo: '/img/avianca.png'
        },
        {
            nombre: 'CMA',
            logo: '/img/cma.png'
        },
        {
            nombre: 'LATAM',
            logo: '/img/latamcargo.png'
        },
        {
            nombre: 'ZIM',
            logo: '/img/zim.png'
        },
        {
            nombre: 'Maersk',
            logo: '/img/maersk.png'
        },
        {
            nombre: 'OOCL',
            logo: '/img/oocl.png'
        },
        {
            nombre: 'Iberia',
            logo: '/img/iberia.png'
        },
        {
            nombre: 'MSC',
            logo: '/img/msc.png'
        },
        {
            nombre: 'PIL',
            logo: '/img/pil.png'
        },
        {
            nombre: 'SkyLogo',
            logo: '/img/skylogo.png'
        },
        {
            nombre: 'COSCO',
            logo: '/img/cosco.png'
        },
        {
            nombre: 'Yangming',
            logo: '/img/yangming.png'
        },
        {
            nombre: 'ONE',
            logo: '/img/one.png'
        },
        {
            nombre: 'JetSmart',
            logo: '/img/jetsmart.png'
        },
        {
            nombre: 'Wan Hai',
            logo: '/img/wanhai.png'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "NAVIERAS Y AEROLÍNEAS"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
                            lineNumber: 28,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90",
                            children: "Colaboramos con las mejores navieras y aerolíneas del sector"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
                            lineNumber: 31,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
                    lineNumber: 27,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8 max-w-6xl mx-auto",
                    children: navieras.map((naviera, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-white/20 backdrop-blur-md rounded-lg p-6 flex items-center justify-center hover:bg-white/30 transition-all duration-200 min-h-[120px] border border-white/20 shadow-lg hover:shadow-xl",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                src: naviera.logo,
                                alt: naviera.nombre,
                                className: "max-w-full max-h-16 w-auto h-auto object-contain",
                                onError: (e)=>{
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `<div class="text-gray-400 text-xs text-center">${naviera.nombre}</div>`;
                                }
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
                                lineNumber: 42,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        }, index, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
                            lineNumber: 38,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
                    lineNumber: 36,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
            lineNumber: 26,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx",
        lineNumber: 25,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = NavierasPrincipales;
const __TURBOPACK__default__export__ = NavierasPrincipales;
var _c;
__turbopack_context__.k.register(_c, "NavierasPrincipales");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Sección: UBICACIÓN / NUESTRAS OFICINAS
 * Mapa y botones de navegación
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const Ubicacion = ()=>{
    const handleGoogleMaps = ()=>{
        window.open('https://maps.app.goo.gl/cGrni677vZDk5pp26', '_blank');
    };
    const handleWaze = ()=>{
        window.open('https://www.waze.com/en/live-map/directions/asli-logistica-y-comercio-exterior-ruta-5-sur?place=w.189269418.1892694183.25097777', '_blank');
    };
    const handleAppleMaps = ()=>{
        window.open('https://maps.apple.com/place?map=satellite&place-id=IEA0826463ACE71BC&address=Caletera+Ruta+5%2C+Curic%C3%B3%2C+Chile&coordinate=-34.9743702%2C-71.2034765&name=ASLI+-+Log%C3%ADstica+y+Comercio+Exterior&_provider=9902', '_blank');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        id: "contacto",
        className: "py-16 md:py-24 bg-asli-dark",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "text-center mb-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "text-4xl md:text-5xl font-bold text-white mb-4",
                            children: "UBICACIÓN / NUESTRAS OFICINAS"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                            lineNumber: 31,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xl text-white/90",
                            children: "Visítanos o contáctanos directamente"
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                            lineNumber: 34,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                    lineNumber: 30,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 lg:grid-cols-2 gap-12",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-8",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-2xl font-bold text-white mb-4",
                                            children: "Dirección"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 41,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-gray-300 text-lg mb-2",
                                            children: "Longitudinal Sur Km. 186"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 42,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-gray-300 text-lg",
                                            children: "3340000 Curicó, Maule"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 45,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                    lineNumber: 40,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-8",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-2xl font-bold text-white mb-4",
                                            children: "Contacto"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 51,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-gray-300 text-lg",
                                            children: "Mario Basaez"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 52,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                            href: "tel:+56968394225",
                                            className: "text-asli-primary hover:text-asli-accent transition-colors duration-200 text-lg",
                                            children: "+56 9 6839 4225"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 55,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                    lineNumber: 50,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-col sm:flex-row gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleGoogleMaps,
                                            className: "bg-asli-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200",
                                            children: "GOOGLE MAPS"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 64,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleWaze,
                                            className: "bg-asli-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200",
                                            children: "WAZE"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 71,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: handleAppleMaps,
                                            className: "bg-asli-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200",
                                            children: "APPLE MAPS"
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                            lineNumber: 78,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                    lineNumber: 63,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                            lineNumber: 39,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-asli-secondary/30 rounded-lg overflow-hidden",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("iframe", {
                                src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4022.7608648636206!2d-71.20605142340338!3d-34.97436577716874!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x966457bfbad3103d%3A0x1a06a30ef08571a5!2sASLI%20-%20Log%C3%ADstica%20y%20Comercio%20Exterior!5e1!3m2!1ses-419!2scl!4v1768069231458!5m2!1ses-419!2scl",
                                width: "100%",
                                height: "100%",
                                style: {
                                    minHeight: '400px',
                                    border: 0
                                },
                                allowFullScreen: "",
                                loading: "lazy",
                                referrerPolicy: "no-referrer-when-downgrade",
                                title: "Ubicación ASLI - Logística y Comercio Exterior"
                            }, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                                lineNumber: 90,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                            lineNumber: 89,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
                    lineNumber: 37,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
            lineNumber: 29,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx",
        lineNumber: 28,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Ubicacion;
const __TURBOPACK__default__export__ = Ubicacion;
var _c;
__turbopack_context__.k.register(_c, "Ubicacion");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Footer
 * Fondo #11224E, información de contacto y slogan
 */ __turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
;
const Footer = ()=>{
    const handleEmailClick = ()=>{
        window.location.href = 'mailto:contacto@asli.cl';
    };
    const handleWhatsAppClick = ()=>{
        window.open('https://api.whatsapp.com/send/?phone=56968394225&text&type=phone_number&app_absent=0', '_blank');
    };
    const handleVisitanosClick = ()=>{
        document.getElementById('contacto')?.scrollIntoView({
            behavior: 'smooth'
        });
    };
    const handleContactanosClick = ()=>{
        // Abrir Gmail con el email de contacto
        const email = 'informaciones@asli.cl';
        const subject = encodeURIComponent('Consulta desde el sitio web');
        const body = encodeURIComponent('Hola, me gustaría obtener más información sobre sus servicios.');
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`, '_blank');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "bg-asli-dark text-gray-200",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "container mx-auto px-4 sm:px-6 lg:px-8 py-12",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 md:grid-cols-3 gap-8 mb-8",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: "/img/logoblanco.png",
                                    alt: "ASLI Logo",
                                    className: "h-12 mb-3 object-contain"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                    lineNumber: 32,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-white/80 text-sm uppercase tracking-wide mb-3",
                                    children: "Logística y Comercio Exterior"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                    lineNumber: 37,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-asli-accent font-semibold italic text-lg",
                                    children: '"NUESTRO LÍMITE ES TU DESTINO"'
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                    lineNumber: 40,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                            lineNumber: 31,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Servicios"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                    lineNumber: 47,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#servicios",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Transporte multimodal"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 50,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 49,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#servicios",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Logística frutícola"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 58,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 57,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#servicios",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Servicios Aduaneros"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 66,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 65,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#servicios",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Asesoría Logística"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 74,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 73,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                    lineNumber: 48,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                            lineNumber: 46,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h4", {
                                    className: "text-lg font-semibold text-white mb-4",
                                    children: "Empresa"
                                }, void 0, false, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                    lineNumber: 86,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                    className: "space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#quienes-somos",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Quiénes Somos"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 89,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 88,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#equipo",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Nuestro Equipo"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 97,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 96,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#socios",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Socios"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 105,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 104,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                href: "#contacto",
                                                className: "hover:text-asli-accent transition-colors duration-200",
                                                children: "Contacto"
                                            }, void 0, false, {
                                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                                lineNumber: 113,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                            lineNumber: 112,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                    lineNumber: 87,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                            lineNumber: 85,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                    lineNumber: 29,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "border-t border-gray-700 pt-8",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col md:flex-row justify-between items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-center md:text-left",
                                children: [
                                    "© ",
                                    new Date().getFullYear(),
                                    " ASLI - Asesorías y Servicios Logísticos Integrales Ltda. Todos los derechos reservados."
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                lineNumber: 126,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col sm:flex-row gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: handleVisitanosClick,
                                        className: "bg-transparent text-white border-2 border-asli-primary px-6 py-2 rounded-md font-semibold hover:bg-asli-primary transition-all duration-200",
                                        children: "Visítanos"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                        lineNumber: 131,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: handleContactanosClick,
                                        className: "bg-asli-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200",
                                        children: "CONTACTANOS AHORA"
                                    }, void 0, false, {
                                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                        lineNumber: 138,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                                lineNumber: 130,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                        lineNumber: 125,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
                    lineNumber: 124,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
            lineNumber: 28,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx",
        lineNumber: 27,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Footer;
const __TURBOPACK__default__export__ = Footer;
var _c;
__turbopack_context__.k.register(_c, "Footer");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/node_modules/next/head.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Header$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Header.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Hero$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Hero.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$QuienesSomos$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/QuienesSomos.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$NuestraHistoria$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestraHistoria.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Servicios$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Servicios.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$NuestroEquipo$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NuestroEquipo.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$AsesoriaComercioInternacional$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/AsesoriaComercioInternacional.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$ClientesPrincipales$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/ClientesPrincipales.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$SomosParteDe$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/SomosParteDe.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$NavierasPrincipales$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/NavierasPrincipales.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Ubicacion$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Ubicacion.jsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Footer$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/src/components/Footer.jsx [client] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
/**
 * Página de inicio (Home) de ASLI
 * Integra todas las secciones según el diseño actual
 */ const Home = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$next$2f$head$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("title", {
                        children: "ASLI - Asesorías y Servicios Logísticos Integrales"
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 23,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "description",
                        content: "ASLI - Asesorías y Servicios Logísticos Integrales Ltda. Exportación, importación, coordinación naviera y transporte terrestre especializado en fruta fresca y congelada. Curicó, Maule."
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 24,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "icon",
                        type: "image/png",
                        href: "/img/logoblanco.png"
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 28,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "apple-touch-icon",
                        href: "/img/logoblanco.png"
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meta", {
                        name: "viewport",
                        content: "width=device-width, initial-scale=1.0"
                    }, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                lineNumber: 22,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "min-h-screen flex flex-col bg-asli-dark",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Header$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 40,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                        className: "flex-grow",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Hero$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 42,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$QuienesSomos$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 43,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$NuestraHistoria$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 44,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Servicios$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 45,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$NuestroEquipo$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 46,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$AsesoriaComercioInternacional$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 47,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$ClientesPrincipales$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 48,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$SomosParteDe$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 49,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$NavierasPrincipales$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 50,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Ubicacion$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                                lineNumber: 51,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 41,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$OneDrive$2f$Documentos$2f$TODO$2f$DESARROLLO$2f$ASLI$2f$web$2f$src$2f$components$2f$Footer$2e$jsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx",
                lineNumber: 39,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true);
};
_c = Home;
const __TURBOPACK__default__export__ = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if (module.hot) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/OneDrive/Documentos/TODO/DESARROLLO/ASLI/web/pages/index.jsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__44e0830a._.js.map