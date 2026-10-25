const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Kawaii_Gakujo.user.js', 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

for (const readyState of ['loading', 'interactive', 'complete']) {
    test(`initialize once when injected at ${readyState}`, async () => {
        const listeners = new Map();
        const timers = [];
        const storage = new Map([['cg_grade_nav', 'old'], ['cg_return_to_task', 'keep']]);
        let starts = 0;
        const context = vm.createContext({
            document: { readyState, title: 'その他', addEventListener: (name, callback) => listeners.set(name, callback) },
            window: { addEventListener: () => assert.fail('must not wait for window.load') },
            sessionStorage: { removeItem: key => storage.delete(key) },
            setTimeout: callback => timers.push(callback),
            console: { log() {}, warn: assert.fail },
        });
        vm.runInContext(source.slice(source.indexOf('    function waitForSelector('),
            source.indexOf('    const setCookie =')), context);
        context.startKawaiiGakujo = () => starts++;
        assert.equal(starts, 0);
        const initialize = readyState === 'loading' ? listeners.get('DOMContentLoaded') : timers[0];
        await initialize();
        await initialize();
        assert.equal(starts, 1);
        assert.equal(storage.has('cg_grade_nav'), false);
        assert.equal(storage.get('cg_return_to_task'), 'keep');
    });
}

test('Cookie values round-trip Japanese task data and expire on deletion', () => {
    const cookies = new Map();
    const writes = [];
    const document = {};
    Object.defineProperty(document, 'cookie', {
        get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
        set(value) {
            writes.push(value);
            const [pair] = value.split(';');
            const index = pair.indexOf('=');
            const key = pair.slice(0, index);
            if (value.includes('max-age=0')) cookies.delete(key);
            else cookies.set(key, pair.slice(index + 1));
        },
    });
    const context = vm.createContext({ document });
    vm.runInContext(source.slice(source.indexOf('    const setCookie ='),
        source.indexOf('    // Resolve only')) + '\nthis.cookieAPI = { setCookie, getCookie, deleteCookie };', context);
    const value = JSON.stringify({ title: '課題; A=B', subject: '数学' });
    context.cookieAPI.setCookie('cg_hidden_test', value);
    assert.equal(decodeURIComponent(context.cookieAPI.getCookie('cg_hidden_test')), value);
    assert.match(writes[0], /; expires=.*; path=\/$/);
    context.cookieAPI.deleteCookie('cg_hidden_test');
    assert.equal(context.cookieAPI.getCookie('cg_hidden_test'), undefined);
});

// Minimal DOM doubles exercise the original preview event handlers, not a rewritten implementation.
function preview({ javascript = true, jquery = true, method = 'POST', extension = 'pdf', status = 200 } = {}) {
    const timers = [];
    const elements = [];
    const requests = [];
    const blobs = [];
    const revoked = [];
    function element(tagName) {
        const node = { tagName, style: {}, dataset: {}, children: [], listeners: {},
            appendChild(child) { this.children.push(child); child.parentNode = this; },
            insertBefore(child) { this.appendChild(child); },
            addEventListener(name, callback) { this.listeners[name] = callback; },
            scrollIntoView() {},
        };
        if (tagName === 'iframe') node.contentDocument = { body: { innerHTML: '' } };
        elements.push(node);
        return node;
    }
    class PreviewURL extends URL {
        static createObjectURL(blob) { blobs.push(blob); return `blob:test-${blobs.length}`; }
        static revokeObjectURL(url) { revoked.push(url); }
    }
    const data = new FormData();
    data.append('_csrf', 'token');
    data.append('file', '添付');
    data.append('file', '2');
    const form = { action: 'https://gakujo.shizuoka.ac.jp/download?existing=1', method };
    const nativeSubmit = () => assert.fail('unexpected navigation');
    const jqSubmit = () => assert.fail('unexpected jQuery submission');
    const window = { isSubmit: true, closeLoading() {},
        ...(jquery ? { jQuery: { fn: { submit: jqSubmit } } } : {}),
    };
    const link = Object.assign(element('a'), {
        innerText: `資料.${extension}`,
        href: javascript ? 'javascript:download()' : `https://gakujo.shizuoka.ac.jp/資料.${extension}`,
        closest: () => null,
        click() {
            if (jquery) window.jQuery.fn.submit.call({ 0: form });
            else context.HTMLFormElement.prototype.submit.call(form);
        },
    });
    element('div').appendChild(link);
    const context = vm.createContext({
        window, URL: PreviewURL, URLSearchParams, Blob,
        location: { href: 'https://gakujo.shizuoka.ac.jp/home' },
        document: { querySelectorAll: () => [link], createElement: element },
        HTMLFormElement: { prototype: { submit: nativeSubmit } },
        FormData: class { constructor(value) { assert.equal(value, form); return data; } },
        setTimeout(callback, delay) { timers.push({ callback, delay }); },
        fetch: async (url, options) => {
            const request = new Request(url, options); // Enforces GET/HEAD body restrictions.
            requests.push(request);
            return new Response('attachment', { status });
        },
    });
    // These names are globals in page context, as on the portal.
    context.isSubmit = window.isSubmit;
    context.closeLoading = window.closeLoading;
    const helperStart = source.indexOf('    async function fetchPreviewBlob(');
    if (helperStart !== -1) {
        vm.runInContext(source.slice(helperStart, source.indexOf('    function startKawaiiGakujo()')), context);
    }
    vm.runInContext(source.slice(source.indexOf('        const previewMimeTypes ='),
        source.indexOf('        document.addEventListener("click", event =>', source.indexOf('        const previewMimeTypes ='))), context);
    return { elements, requests, blobs, revoked, data, async run() {
        if (javascript) elements.find(node => node.tagName === 'button').listeners.click();
        for (const { callback } of timers.sort((a, b) => a.delay - b.delay)) await callback();
        await flush();
        assert.equal(context.HTMLFormElement.prototype.submit, nativeSubmit);
        if (jquery) assert.equal(window.jQuery.fn.submit, jqSubmit);
    } };
}

test('preview sends GET form fields in the query, preserving duplicate fields', async () => {
    const state = preview({ method: 'GET' });
    await state.run();
    assert.equal(state.requests.length, 1);
    const request = state.requests[0];
    const url = new URL(request.url);
    assert.equal(request.method, 'GET');
    assert.equal(request.body, null);
    assert.equal(url.searchParams.get('existing'), '1');
    assert.equal(url.searchParams.get('_csrf'), 'token');
    assert.deepEqual(url.searchParams.getAll('file'), ['添付', '2']);
    assert.equal(request.credentials, 'same-origin');
});

for (const jquery of [true, false]) {
    test(`preview captures ${jquery ? 'page jQuery' : 'native'} POST and restores submit`, async () => {
        const state = preview({ jquery });
        await state.run();
        const request = state.requests[0];
        assert.equal(request.method, 'POST');
        const fields = await request.formData();
        assert.equal(fields.get('_csrf'), 'token');
        assert.deepEqual(fields.getAll('file'), ['添付', '2']);
        assert.equal(state.elements.find(node => node.tagName === 'iframe').src, 'blob:test-1');
    });
}

for (const javascript of [true, false]) {
    test(`HTTP failure shows an error for ${javascript ? 'form' : 'direct link'} preview`, async () => {
        const state = preview({ javascript, status: 500 });
        await state.run();
        assert.equal(state.blobs.length, 0);
        assert.match(state.elements.find(node => node.tagName === 'iframe').contentDocument.body.innerHTML, /読み込みに失敗/);
    });
}

for (const [extension, mime] of [['pdf', 'application/pdf'], ['txt', 'text/plain'], ['png', 'image/png']]) {
    test(`direct ${extension} preview uses the expected MIME and viewer`, async () => {
        const state = preview({ javascript: false, extension });
        await state.run();
        assert.equal(state.blobs[0].type, mime);
        if (extension === 'png') {
            const image = state.elements.find(node => node.tagName === 'img');
            assert.equal(image.src, 'blob:test-1');
            image.onload();
            assert.deepEqual(state.revoked, ['blob:test-1']);
        } else {
            assert.equal(state.elements.find(node => node.tagName === 'iframe').src, 'blob:test-1');
        }
    });
}
