const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Kawaii_Gakujo.user.js', 'utf8');
const day = 86400000;
function setup(entries = []) {
    const values = new Map(entries);
    const storage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key),
    };
    const properties = new Map();
    const bg = { dataset: {}, style: { backgroundImage: '',
        setProperty: (key, value) => properties.set(key, value),
        removeProperty: key => properties.delete(key),
    } };
    const visual = bg;
    const context = vm.createContext({ console });
    vm.runInContext(source.slice(source.indexOf('    function formatTimeLeft('), source.indexOf('    function installHomeTaskCountdown(')), context);
    const controller = context.createHeaderBackgroundController(visual, storage);
    return { values, storage, properties, bg, visual, context, controller };
}

test('existing image becomes the normal background without rewriting saved data', () => {
    const state = setup([['cg-header-image', 'data:image/png;base64,old']]);
    assert.equal(state.controller.settings.warningDays, 3);
    assert.equal(state.controller.settings.images.normal, 'data:image/png;base64,old');
    assert.equal(state.bg.style.backgroundImage, 'url("data:image/png;base64,old")');
    assert.equal(state.values.size, 1);
    assert.equal(state.properties.size, 0); // Unset warning images use the existing CSS patterns.
});

test('three backgrounds persist independently and survive reloading', () => {
    const state = setup();
    for (const mode of ['normal', 'warning', 'critical']) state.controller.setImage(mode, `data:image/png;base64,${mode}`);
    state.controller.setWarningDays(5);
    const reloaded = setup([...state.values]);
    assert.equal(reloaded.controller.settings.warningDays, 5);
    for (const mode of ['normal', 'warning', 'critical']) {
        assert.equal(reloaded.controller.settings.images[mode], `data:image/png;base64,${mode}`);
    }
    assert.equal(reloaded.properties.get('--cg-header-warning-image'), 'url("data:image/png;base64,warning")');
    assert.equal(reloaded.properties.get('--cg-header-critical-image'), 'url("data:image/png;base64,critical")');
});

test('custom day threshold has exact boundaries and under-one-day takes priority', () => {
    const { controller, visual } = setup();
    controller.setWarningDays(7);
    for (const [remaining, expected] of [[7 * day, undefined], [7 * day - 1, 'warning'], [day, 'warning'], [day - 1, 'critical'], [0, undefined], [-1, undefined], [Infinity, undefined], [NaN, undefined]]) {
        controller.render(remaining);
        assert.equal(visual.dataset.cgDeadlineUrgency, expected, String(remaining));
    }
    controller.render(6 * day);
    assert.equal(visual.dataset.cgDeadlineUrgency, 'warning');
    controller.setWarningDays(4);
    assert.equal(visual.dataset.cgDeadlineUrgency, undefined); // Applies immediately, without a timer tick.
});

test('reset removes only the selected background and restores its default', () => {
    const { controller, values, properties, bg } = setup();
    for (const mode of ['normal', 'warning', 'critical']) controller.setImage(mode, mode);
    controller.setImage('warning', '');
    assert.equal(values.has('cg-header-image-warning'), false);
    assert.equal(properties.has('--cg-header-warning-image'), false);
    assert.equal(values.get('cg-header-image-critical'), 'critical');
    assert.equal(bg.style.backgroundImage, 'url("normal")');
    controller.setImage('normal', '');
    assert.equal(bg.style.backgroundImage, '');
    assert.equal(values.get('cg-header-image-critical'), 'critical');
});

test('invalid days cannot overwrite a valid setting; invalid saved days use three', () => {
    for (const value of ['', 'bad', 0, 1, 1.5, -3, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        const { controller, values } = setup([['cg-header-warning-days', '5']]);
        assert.throws(() => controller.setWarningDays(value), /2以上の整数/);
        assert.equal(controller.settings.warningDays, 5);
        assert.equal(values.get('cg-header-warning-days'), '5');
        assert.equal(setup([['cg-header-warning-days', String(value)]]).controller.settings.warningDays, 3);
    }
});

test('storage failure preserves saved and displayed backgrounds and the threshold', () => {
    const { controller, storage, values, bg } = setup([['cg-header-image', 'old']]);
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    assert.throws(() => controller.setImage('normal', 'new'), /QuotaExceededError/);
    assert.equal(values.get('cg-header-image'), 'old');
    assert.equal(bg.style.backgroundImage, 'url("old")');
    assert.equal(controller.settings.images.normal, 'old');
    assert.throws(() => controller.setWarningDays(10), /QuotaExceededError/);
    assert.equal(controller.settings.warningDays, 3);
});

test('home countdown text follows n days while default task countdown stays at three', () => {
    const { context } = setup();
    const timer = { style: {} };
    context.renderDeadlineCountdown(timer, 4 * day, 0, 5);
    assert.equal(timer.style.color, '#FF8C00');
    context.renderDeadlineCountdown(timer, 4 * day);
    assert.equal(timer.style.color, '');
    context.renderDeadlineCountdown(timer, day - 1, 0, 5);
    assert.equal(timer.style.color, 'red');
});

test('settings panel selects, saves and resets each image and updates n', async () => {
    const { context, storage, values, visual } = setup();
    const elements = [];
    function element(tagName) {
        const node = { tagName, style: {}, attributes: {}, children: [], listeners: {},
            appendChild(child) { this.children.push(child); child.parentNode = this; },
            append(...children) { children.forEach(child => this.appendChild(child)); },
            setAttribute(key, value) { this.attributes[key] = value; },
            removeAttribute(key) { delete this[key]; },
            addEventListener(name, callback) { this.listeners[name] = callback; },
            contains(target) { return this === target || this.children.some(child => child.contains?.(target)); },
            click() { this.listeners.click?.(); }, focus() {},
            getBoundingClientRect: () => ({ bottom: 50, right: 980 }),
            offsetHeight: 400, offsetWidth: 350,
        };
        if (tagName === 'canvas') {
            node.getContext = () => ({ drawImage() {} });
            node.toDataURL = () => 'data:image/png;base64,chosen';
        }
        elements.push(node);
        return node;
    }
    Object.assign(visual, { appendChild() {}, getBoundingClientRect: () => ({ width: 912, height: 724 }) });
    context.document = {
        querySelector: selector => selector === '.c-header' ? { getBoundingClientRect: () => ({ bottom: 76 }) } : null,
        getElementById: id => id === 'cg-page-background' ? visual : elements.find(node => node.id === id),
        createElement: element,
        createTextNode: text => ({ textContent: text }),
        head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
    };
    context.localStorage = storage;
    context.window = { innerWidth: 1000, innerHeight: 800, addEventListener() {} };
    context.FileReader = class { readAsDataURL() { this.result = 'chosen'; this.onload(); } };
    context.Image = class {
        width = 2000; height = 1000;
        set src(value) { this.onload(); }
    };
    vm.runInContext(source.slice(source.indexOf('    function prepareHeaderImage('), source.indexOf('    async function fetchPreviewBlob(')), context);
    const controller = context.installHeaderBackgroundSettings();
    const byId = id => elements.find(node => node.id === id);
    const panel = byId('cg-header-settings');
    const toggle = byId('cg-header-uploader-btn');
    assert.equal(panel.hidden, true);
    toggle.click();
    assert.equal(panel.hidden, false);
    assert.equal(toggle.attributes['aria-expanded'], 'true');
    const rows = elements.filter(node => node.className === 'cg-header-image-row');
    assert.equal(rows.length, 3);
    for (const [index, key] of ['cg-header-image', 'cg-header-image-warning', 'cg-header-image-critical'].entries()) {
        const input = rows[index].children[2].children[2];
        assert.equal(input.accept, 'image/*');
        input.files = [{ name: 'background.png' }];
        input.listeners.change();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(values.get(key), 'data:image/png;base64,chosen');
        assert.equal(rows[index].children[1].hidden, false);
        assert.equal(rows[index].children[2].children[0].disabled, false);
        assert.equal(elements.some(node => node.tagName === 'dialog'), false);
    }
    controller.render(4 * day);
    const days = byId('cg-header-warning-days');
    days.value = '5';
    days.listeners.change();
    assert.equal(values.get('cg-header-warning-days'), '5');
    assert.equal(rows[1].children[0].textContent, '5日未満');
    assert.equal(visual.dataset.cgDeadlineUrgency, 'warning');
    days.value = '1';
    days.listeners.change();
    assert.equal(days.value, '5');
    assert.match(byId('cg-header-settings-error').textContent, /2以上の整数/);
    rows[1].children[2].children[1].click();
    assert.equal(values.has('cg-header-image-warning'), false);
    assert.equal(values.has('cg-header-image-critical'), true);
    assert.equal(rows[1].children[1].hidden, true);

    const input = rows[0].children[2].children[2];
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    input.files = [{ name: 'replacement.webp' }];
    input.listeners.change();
    assert.equal(values.get('cg-header-image'), 'data:image/png;base64,chosen');
    assert.match(byId('cg-header-settings-error').textContent, /画像を保存できません/);
    assert.equal(rows[0].children[2].children[0].disabled, false, 'saving failure must allow retrying');
    context.Image = class { set src(value) { this.onerror(); } };
    input.listeners.change();
    assert.match(byId('cg-header-settings-error').textContent, /この画像は読み込めません/);
    assert.equal(rows[0].children[2].children[0].disabled, false);
    context.FileReader = class { readAsDataURL() { this.onerror(); } };
    input.listeners.change();
    assert.match(byId('cg-header-settings-error').textContent, /画像を読み込めませんでした/);
    assert.equal(rows[0].children[2].children[0].disabled, false);
});
