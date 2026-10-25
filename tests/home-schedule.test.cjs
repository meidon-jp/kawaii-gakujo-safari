const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Kawaii_Gakujo.user.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('    function parseHomeLecture('), source.indexOf('    function installHomeSchedule(')), context);
const parse = lines => context.parseHomeLecture(lines);

test('portal periods map to five slots without packing gaps', () => {
    for (const [period, slot] of [['1・2', 1], ['3・4', 2], ['5・6', 3], ['7・8', 4], ['9・10', 5]]) {
        const lecture = parse([`${period}限 08:40-10:10`, '科目名', '教室', '教員名']);
        assert.equal(lecture.slot, slot);
        assert.equal(lecture.subject, '科目名');
        assert.equal(lecture.room, '教室');
    }
});

test('half-slot lectures retain the original period annotation and actual time', () => {
    const period = '7・8限（前半0.5コマ）  14:25-15:10';
    const lecture = parse([period, '創造教育実習(後期前半)', 'その他', '教員名 他']);
    assert.equal(lecture.slot, 4);
    assert.equal(lecture.period, period);
});

test('a missing classroom never exposes the teacher as the classroom', () => {
    assert.equal(parse(['1・2限 08:40-10:10', '機械工学概論', '教員名 他']).room, '');
    assert.equal(parse(['1・2限 08:40-10:10', '機械工学概論', '', '教員名 他']).room, '');
});

test('full-width and individual periods still map to the correct slot', () => {
    assert.equal(parse(['５・６限 １２:４５-１４:１５', '科目名', '教室', '教員名']).slot, 3);
    assert.equal(parse(['8限 15:10-15:55', '科目名', '教室', '教員名']).slot, 4);
});

test('events, unknown periods and incomplete titles stay untouched', () => {
    for (const lines of [[], ['行事'], ['集中講義', '科目名'], ['11・12限 18:00-19:30', '科目名'],
        ['0限 08:00-08:30', '科目名'], ['1・2限 08:40-10:10']]) assert.equal(parse(lines), null);
});

test('observe the stable home container and use the replacement calendar after portal redraw', () => {
    let notify, observed, current;
    const heights = [];
    const calendar = name => ({ isConnected: true,
        querySelectorAll: () => [], style: { setProperty: (key, value) => heights.push([name, key, value]) } });
    const container = { querySelector: () => current, getBoundingClientRect: () => ({ width: 800 }) };
    const context = vm.createContext({
        document: { querySelector: () => container, getElementById: () => null,
            createElement: () => ({}), head: { appendChild() {} } },
        MutationObserver: class { constructor(callback) { notify = callback; } observe(target) { observed = target; } },
    });
    vm.runInContext(source.slice(source.indexOf('    function installHomeSchedule('), source.indexOf('    function installHomeAppearance(')), context);
    context.installHomeSchedule(); // The initial response can have no calendar yet.
    assert.equal(observed, container);
    current = calendar('first'); notify();
    const old = current;
    old.isConnected = false;
    current = calendar('replacement'); notify();
    assert.deepEqual(heights.map(row => row[0]), ['first', 'replacement']);
    assert.equal(heights[1][2], '0px');
});

test('cards use square dimensions in CSS pixels and grow only for overflowing text', () => {
    let width = 154, textHeight = 90, height;
    const card = { querySelector: () => ({ scrollHeight: textHeight,
        getBoundingClientRect() { assert.fail('zoomed rectangles must not set CSS heights'); } }) };
    const items = { children: [card] };
    const calendar = { isConnected: true, querySelectorAll: selector => selector === '.cg-home-slot-items' ? [items] : [],
        style: { setProperty: (key, value) => { height = value; } } };
    const container = { querySelector: () => calendar, getBoundingClientRect: () => ({ width: 1100 }) };
    let update;
    const context = vm.createContext({
        document: { querySelector: () => container, getElementById: () => null,
            createElement: () => ({}), head: { appendChild() {} } },
        getComputedStyle: element => element === items ? { width: `${width}px` } : { paddingTop: '8px', paddingBottom: '8px' },
        MutationObserver: class { constructor(callback) { update = callback; } observe() {} },
    });
    vm.runInContext(source.slice(source.indexOf('    function installHomeSchedule('), source.indexOf('    function installHomeAppearance(')), context);
    context.installHomeSchedule();
    assert.equal(height, '154px');
    width = 100; textHeight = 140; update();
    assert.equal(height, '156px');
});
