import { expect } from '@open-wc/testing';
import {
  Pool,
  QueryString,
  css,
  raw,
  createCSSSheet,
  styled,
  SheetToken,
  styleMap,
  classMap,
  absoluteLocation,
} from '../lib/utils';

describe('utils 测试', () => {
  it('absoluteLocation', () => {
    expect(absoluteLocation('/a', '/a/b')).to.equal('/a/b');
    expect(absoluteLocation('/a/c', './b')).to.equal('/a/b');
    expect(absoluteLocation('/a/c/d', '../b')).to.equal('/a/b');
  });
  it('Pool', () => {
    const pool = new Pool<() => void>();
    let countAtStart = 0;
    let countAtPause = 0;
    pool.addEventListener('start', () => (countAtStart = pool.count));
    pool.addEventListener('end', () => (countAtPause = pool.count));
    const fun1 = () => ({});
    const fun2 = () => ({});
    pool.add(fun1);
    pool.add(fun2);
    pool.add(fun1);
    expect(pool.get()).to.equal(fun2);
    expect(pool.get()).to.equal(fun1);
    expect(countAtStart).to.equal(0);
    expect(countAtPause).to.equal(3);
    expect(pool.pool.size).to.equal(0);
    expect(pool.get()).to.equal(undefined);
  });
  it('QueryString', () => {
    expect(new QueryString(undefined).toString()).to.equal('');
    const query = new QueryString('a=1&b=2');
    expect(query.toJSON()).to.equal('?a=1&b=2');
    expect(query.toString()).to.equal('?a=1&b=2');
    expect(query.get('a')).to.equal('1');
    query.concat('c=3');
    expect(query.get('c')).to.equal('3');
    query.concat({ d: 4 });
    expect(query.toString()).to.equal('?a=1&b=2&c=3&d=4');
    expect(new QueryString({ a: 1 }).toString()).to.equal('?a=1');
    expect(new QueryString(query).toString()).to.equal(query.toString());
  });
  it('createCSSSheet', () => {
    const cssSheet = createCSSSheet(css`
      body {
        background: red;
      }
    `);
    const rules = cssSheet[SheetToken].cssRules;
    expect(rules.item(0).selectorText).to.equal('body');
    expect(rules.item(0).style.background).to.equal('red');
  });
  it('raw/css', () => {
    const title: any = undefined;
    expect(raw`<div title=${title}></div>`).to.equal('<div title=""></div>');
    expect(raw`<div>${'str'}</div>`).to.equal('<div>str</div>');
  });
  it('styled', () => {
    const cssSheet = createCSSSheet({
      scroll: styled.class`
        background: red;
        &:hover * {
          background: blue;
        }
      `,
      wrap: styled.id`
        position: fixed;
      `,
      div: styled.tag`
        border: 1px solid;
      `,
    });
    expect(cssSheet.scroll.startsWith('scroll')).to.true;
    const rules = cssSheet[SheetToken].cssRules;
    expect(rules.item(0).selectorText.startsWith('.scroll')).to.true;
    expect(rules.item(0).style.background.startsWith('red')).to.true;
    expect(/\.scroll(-|\w)+:hover \*/.test(rules.item(1).selectorText)).to.true;
    expect(rules.item(1).style.background.startsWith('blue')).to.true;
    expect(rules.item(2).selectorText.startsWith('#wrap')).to.true;
    expect(rules.item(3).selectorText).to.equal('div');
  });
  it('styleMap/classMap', () => {
    expect(styleMap({ fontSize: '14px', content: `'*'` })).to.equal(`font-size:14px;content:'*';`);
    expect(classMap({ foo: true, content: false })).to.equal(` foo `);
  });
});
