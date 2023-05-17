import { expect } from '@open-wc/testing';

import {
  LinkedList,
  QueryString,
  css,
  raw,
  createCSSSheet,
  styled,
  SheetToken,
  styleMap,
  classMap,
  exportPartsMap,
  absoluteLocation,
} from '../lib/utils';

declare global {
  interface CSSRuleList {
    item(index: number): CSSStyleRule;
  }
}

describe('utils 测试', () => {
  it('absoluteLocation', () => {
    expect(absoluteLocation('/a', '/a/b')).to.equal('/a/b');
    expect(absoluteLocation('/a/c', './b')).to.equal('/a/b');
    expect(absoluteLocation('/a/c/d', '../b')).to.equal('/a/b');
  });
  it('LinkedList', () => {
    const linkedList = new LinkedList<() => void>();
    let countAtStart = 0;
    let countAtPause = 0;
    linkedList.addEventListener('start', () => (countAtStart = linkedList.size));
    linkedList.addEventListener('end', () => (countAtPause = linkedList.size));
    const fun1 = () => 1;
    const fun2 = () => 2;
    linkedList.add(fun1);
    linkedList.add(fun2);
    linkedList.delete(fun2);
    expect(linkedList.size).to.equal(1);
    linkedList.add(fun2);
    linkedList.add(fun1);
    expect(linkedList.size).to.equal(2);
    expect(linkedList.get()).to.equal(fun2);
    expect(linkedList.get()).to.equal(fun1);
    expect(linkedList.size).to.equal(0);
    expect(linkedList.get()).to.equal(undefined);
    expect(countAtStart).to.equal(0);
    expect(countAtPause).to.equal(0);
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
    query.setAny('obj', { a: 1, b: 2 });
    expect(query.getAny('obj')).to.deep.equal({ a: 1, b: 2 });
    expect(query.getAnyAll('obj')).to.deep.equal([{ a: 1, b: 2 }]);
    query.setAny('obj', [{ a: 1, b: 2 }]);
    expect(query.getAny('obj')).to.deep.equal({ a: 1, b: 2 });
    expect(query.getAnyAll('obj')).to.deep.equal([{ a: 1, b: 2 }]);
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
    expect(raw`<div title="${title}" class="${0}"></div>`).to.equal('<div title="" class="0"></div>');
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
    });
    expect(cssSheet.scroll.startsWith('scroll')).to.true;
    const rules = cssSheet[SheetToken].cssRules;
    expect(rules.item(0).selectorText.startsWith('.scroll')).to.true;
    expect(rules.item(0).style.background.startsWith('red')).to.true;
    expect(/\.scroll(-|\w)+:hover \*/.test(rules.item(1).selectorText)).to.true;
    expect(rules.item(1).style.background.startsWith('blue')).to.true;
    expect(rules.item(2).selectorText.startsWith('#wrap')).to.true;
  });
  it('styleMap/classMap/exportPartsMap', () => {
    expect(styleMap({ '--x': '1px', fontSize: '14px', content: `'*'` })).to.equal(
      `;--x:1px;font-size:14px;content:'*';`,
    );
    expect(classMap({ foo: true, content: false })).to.equal(` foo `);
    expect(exportPartsMap({ foo: 'bar', content: 'content' })).to.equal(`,foo:bar,content:content,`);
  });
});
