const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Kawaii_Gakujo.user.js', 'utf8');
const helpers = source.slice(source.indexOf('    function prepareHeaderImage('), source.indexOf('    function installHeaderBackgroundSettings('));

function setup({ png = 'data:image/png;base64,small', jpeg = 'data:image/jpeg;base64,small', noContext = false } = {}) {
    const draws = [], exports = [], fills = [];
    const ctx = { drawImage: (...args) => draws.push(args), fillRect: (...args) => fills.push(args) };
    const canvas = { getContext: () => noContext ? null : ctx, toDataURL(type, quality) {
        exports.push([type, quality]);
        const result = type === 'image/png' ? png : jpeg;
        return typeof result === 'function' ? result(quality, canvas.width, canvas.height) : result;
    } };
    const context = vm.createContext({ document: { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } } });
    vm.runInContext(helpers, context);
    return { context, canvas, draws, exports, fills, ctx };
}

test('whole landscape and portrait images are saved without a viewport-dependent crop', () => {
    for (const [width, height, outW, outH] of [[4000, 2000, 2048, 1024], [1000, 5000, 410, 2048], [137, 89, 137, 89]]) {
        const state = setup();
        const image = { naturalWidth: width, naturalHeight: height };
        assert.equal(state.context.prepareHeaderImage(image), 'data:image/png;base64,small');
        assert.equal(state.canvas.width, outW);
        assert.equal(state.canvas.height, outH);
        // Five arguments scale the entire source; there is no source crop rectangle.
        assert.deepEqual(state.draws, [[image, 0, 0, outW, outH]]);
        assert.deepEqual(state.exports, [['image/png', undefined]]);
    }
});

test('large PNG falls back to JPEG after placing white behind transparent pixels', () => {
    const state = setup({ png: 'x'.repeat(3 * 1024 * 1024 + 1) });
    assert.equal(state.context.prepareHeaderImage({ width: 800, height: 600 }), 'data:image/jpeg;base64,small');
    assert.equal(state.ctx.globalCompositeOperation, 'destination-over');
    assert.equal(state.ctx.fillStyle, 'white');
    assert.deepEqual(state.fills, [[0, 0, 800, 600]]);
    assert.deepEqual(state.exports, [['image/png', undefined], ['image/jpeg', 0.9]]);
});

test('oversized encoded image reports an error before saving', () => {
    const large = 'x'.repeat(3 * 1024 * 1024 + 1);
    const { context } = setup({ png: large, jpeg: large });
    assert.throws(() => context.prepareHeaderImage({ width: 800, height: 600 }), /圧縮/);
});

test('invalid image dimensions and unavailable canvas report readable errors', () => {
    assert.throws(() => setup().context.prepareHeaderImage({ width: 0, height: 0 }), /サイズ/);
    assert.throws(() => setup({ noContext: true }).context.prepareHeaderImage({ width: 800, height: 600 }), /処理できません/);
});

test('a third background is compressed to fit without removing either saved image', () => {
    const state = setup({ png: 'p'.repeat(3000000),
        jpeg: (quality, width, height) => 'j'.repeat(Math.ceil(width * height * quality * 1.5)) });
    const values = new Map([['normal', 'n'.repeat(3095278)], ['critical', 'c'.repeat(1346463)]]);
    const oldNormal = values.get('normal'), oldCritical = values.get('critical');
    let attempts = 0;
    const background = { setImage(key, value) {
        attempts++;
        const total = [...values].reduce((sum, [savedKey, saved]) => sum + (key === savedKey ? 0 : saved.length), value.length);
        if (total > 5 * 1024 * 1024) throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
        values.set(key, value);
    } };
    state.context.saveHeaderImage(background, 'warning', { naturalWidth: 2048, naturalHeight: 1024 });
    assert.ok(attempts > 1, 'saving must retry after the capacity error');
    assert.ok(values.get('warning').length < 800000);
    assert.equal(values.get('normal'), oldNormal);
    assert.equal(values.get('critical'), oldCritical);
    assert.ok(state.draws.every(draw => draw.length === 5), 'compression must preserve the entire image');
});

test('an unavailable store does not trigger compression retries', () => {
    const state = setup();
    let attempts = 0;
    assert.throws(() => state.context.saveHeaderImage({ setImage() {
        attempts++;
        throw Object.assign(new Error('blocked'), { name: 'SecurityError' });
    } }, 'normal', { width: 800, height: 600 }), /保存/);
    assert.equal(attempts, 1);
});

test('a full store stops retrying when even a tiny image cannot fit', () => {
    const state = setup();
    let attempts = 0;
    assert.throws(() => state.context.saveHeaderImage({ setImage() {
        attempts++;
        throw Object.assign(new Error('full'), { name: 'QuotaExceededError' });
    } }, 'normal', { width: 800, height: 600 }), /容量/);
    assert.equal(attempts, 1);
});
