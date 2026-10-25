const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Kawaii_Gakujo.user.js', 'utf8');
const helpers = source.slice(source.indexOf('    function waitForSelector('), source.indexOf('    // Check existing content'));
const backgroundHelpers = source.slice(source.indexOf('    function homeTaskDeadline('), source.indexOf('    function createHeaderBackgroundController('));

test('existing elements are ready without a polling or stabilization delay', async () => {
    const node = {};
    const context = vm.createContext({ document: { querySelector: () => node },
        setTimeout: () => assert.fail('unexpected timer'), MutationObserver: class { constructor() { assert.fail('unexpected observer'); } } });
    vm.runInContext(helpers, context);
    assert.equal(await context.waitForSelector('.ready'), node);
});

test('later elements initialize on their first mutation and release the timeout', async () => {
    let node, notify, disconnected = false, cleared = false;
    const context = vm.createContext({ document: { documentElement: {}, querySelector: () => node },
        setTimeout: () => 7, clearTimeout: id => { assert.equal(id, 7); cleared = true; },
        MutationObserver: class { constructor(callback) { notify = callback; } observe() {} disconnect() { disconnected = true; } } });
    vm.runInContext(helpers, context);
    const promise = context.waitForSelector('.later');
    node = {};
    notify();
    assert.equal(await promise, node);
    assert.equal(disconnected, true);
    assert.equal(cleared, true);
});

function earlyPage({ embedded = false, hostname = 'gakujo.shizuoka.ac.jp', ready = false,
    home = false, deadlines = [], warningDays = '2', blockedStorage = false } = {}) {
    const nodes = new Map();
    let available = ready, notify, disconnected = false;
    const classes = new Set();
    const body = { appendChild(node) { node.parentNode = body; nodes.set(node.id, node); } };
    const wrapper = { appendChild() { assert.fail('background must stay outside the wrapper blurred by the menu'); } };
    const appendChild = node => nodes.set(node.id, node);
    const frame = {};
    const context = vm.createContext({
        window: { self: frame, top: embedded ? {} : frame }, location: { hostname },
        document: { body: ready ? body : null, head: null, title: home ? 'ホーム画面（学生・保護者）' : '課題・アンケートリスト',
            documentElement: { appendChild, classList: { add: name => classes.add(name) } },
            querySelector: () => available ? wrapper : null,
            getElementById: id => nodes.get(id),
            createElement: () => ({ textContent: '', dataset: {}, setAttribute(name, value) { this[name] = value; } }) },
        MutationObserver: class { constructor(callback) { notify = callback; } observe() {} disconnect() { disconnected = true; } },
        localStorage: { getItem: key => key === 'cg-header-warning-days' ? warningDays : `data:image/png;base64,${key === 'cg-header-image' ? 'old' : key}` },
        sessionStorage: { getItem() { if (blockedStorage) throw Error('blocked'); return JSON.stringify(deadlines); } }, console: { debug() {} },
    });
    vm.runInContext(backgroundHelpers + helpers, context);
    return { context, nodes, classes, ready() { available = true; context.document.body = body; notify(); }, disconnected: () => disconnected };
}

test('page background CSS is installed before body parsing; its layer waits for the real page shell', () => {
    const state = earlyPage();
    state.context.installEarlyAppearance();
    const style = state.nodes.get('cg-early-appearance');
    assert.match(style.textContent, /position: fixed/);
    assert.match(style.textContent, /data:image\/png;base64,old/);
    assert.match(style.textContent, /:not\(\[data-cg-background-ready\]\)/);
    assert.equal(state.nodes.has('cg-page-background'), false);
    state.ready();
    const layer = state.nodes.get('cg-page-background');
    assert.equal(layer.parentNode, state.context.document.body);
    assert.equal(layer['aria-hidden'], 'true');
    assert.equal(state.classes.has('cg-page-appearance'), true);
    assert.equal(state.disconnected(), true);
    state.context.installEarlyAppearance();
    assert.equal(state.nodes.get('cg-early-appearance'), style);
    assert.equal(state.nodes.get('cg-page-background'), layer);
});

test('background never modifies SSO or embedded pages', () => {
    for (const options of [{ hostname: 'idp.shizuoka.ac.jp', ready: true }, { embedded: true, ready: true }]) {
        const state = earlyPage(options);
        state.context.installEarlyAppearance();
        assert.equal(state.nodes.size, 0);
        assert.equal(state.classes.size, 0);
    }
});

test('glass content styles are limited to task and notice list/detail pages', () => {
    for (const [title, glass, taskDetail, notice] of [
        ['課題・アンケートリスト', true, false, false],
        ['課題・アンケート提出', true, true, false],
        ['課題・アンケート詳細', true, true, false],
        ['連絡一覧', true, false, true],
        ['連絡詳細', true, false, true],
        ['ホーム画面（学生・保護者）', false, false, false],
        ['成績情報', false, false, false],
        ['履修登録', false, false, false],
    ]) {
        const state = earlyPage({ ready: true });
        state.context.document.title = title;
        state.context.installEarlyAppearance();
        assert.equal(state.classes.has('cg-glass-content'), glass, title);
        assert.equal(state.classes.has('cg-task-detail'), taskDetail, title);
        assert.equal(state.classes.has('cg-notice-page'), notice, title);
    }
});

test('reload chooses the warning image before attaching the background and preloads all three images', () => {
    const state = earlyPage({ home: true, ready: true, deadlines: [Date.now() + 1.5 * 86400000] });
    state.context.installEarlyAppearance();
    assert.equal(state.nodes.get('cg-page-background').dataset.cgDeadlineUrgency, 'warning');
    const css = state.nodes.get('cg-early-appearance').textContent;
    assert.match(css, /--cg-header-warning-image: url\("data:image\/png;base64,cg-header-image-warning"\)/);
    assert.match(css, /--cg-header-critical-image: url\("data:image\/png;base64,cg-header-image-critical"\)/);
    assert.match(css, /\.cg-page-appearance \.c-footer-inner \{ background-color: transparent; \}/);
});

test('initial urgency uses current time and configured days, ignoring expired or invalid cached deadlines', () => {
    const now = Date.now();
    for (const [options, expected] of [
        [{ deadlines: [now - 1000, now + 3600000] }, 'critical'],
        [{ deadlines: [now + 2.5 * 86400000], warningDays: '4' }, 'warning'],
        [{ deadlines: [now + 2.5 * 86400000] }, undefined],
        [{ deadlines: [now - 1000, 'invalid'] }, undefined],
        [{ deadlines: [now + 3600000], home: false }, undefined],
        [{ blockedStorage: true }, undefined],
    ]) {
        const state = earlyPage({ home: true, ready: true, ...options });
        state.context.installEarlyAppearance();
        assert.equal(state.nodes.get('cg-page-background').dataset.cgDeadlineUrgency, expected);
    }
});

test('deadline cache stores timestamps only, updates changed data and clears completed tasks', () => {
    let stored = null, writes = 0;
    const context = vm.createContext({ console, sessionStorage: {
        getItem: () => stored, setItem(key, value) { assert.equal(key, 'cg-home-deadlines'); stored = value; writes++; },
    } });
    vm.runInContext(backgroundHelpers + helpers, context);
    const texts = ['締切 2026/10/24 12:00', 'invalid'];
    context.cacheHomeDeadlines(texts);
    assert.deepEqual(JSON.parse(stored), [Date.parse('2026-10-24T12:00:00+09:00')]);
    context.cacheHomeDeadlines(texts);
    assert.equal(writes, 1);
    context.cacheHomeDeadlines([]);
    assert.equal(stored, '[]');
});
