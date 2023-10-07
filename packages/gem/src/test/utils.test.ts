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
    // only test style rule
    item(index: number): CSSStyleRule;
  }
}

describe('utils 测试', () => {
  it('absoluteLocation', () => {
    expect(absoluteLocation('/a', '/a/b')).to.equal('/a/b');
    expect(absoluteLocation('/a/c', './b')).to.equal('/a/b');
    expect(absoluteLocation('/a/c/d', '../b')).to.equal('/a/b');
    expect(absoluteLocation('/a/c/d', '../b?a=a#a')).to.equal('/a/b?a=a#a');
    expect(absoluteLocation('/a/c/d', '../b?a=测试#测试#')).to.equal('/a/b?a=%E6%B5%8B%E8%AF%95#测试#');
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
    expect(linkedList.first?.value).to.equal(fun1);
    expect(linkedList.last?.value).to.equal(fun2);
    expect(linkedList.find(fun1)).to.equal(linkedList.first);
    expect(linkedList.find(fun2)).to.equal(linkedList.last);
    expect(linkedList.find(fun1)?.next).to.equal(linkedList.last);
    const subLinked = new LinkedList();
    subLinked.add(fun1);
    subLinked.add(fun2);
    expect(linkedList.isSuperLinkOf(subLinked)).to.equal(true);
    expect(new LinkedList().isSuperLinkOf(subLinked)).to.equal(false);
    expect(subLinked.isSuperLinkOf(new LinkedList())).to.equal(true);

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
        animation: 3s infinite alternate slideIn;
      `,
      slideIn: styled.keyframes`
        from {
          transform: translateX(0%);
        }
      `,
    });
    expect(cssSheet.scroll.startsWith('scroll')).to.true;
    const rules = cssSheet[SheetToken].cssRules;
    expect(rules.item(0).selectorText.startsWith('.scroll')).to.true;
    expect(rules.item(0).style.background).to.equal('red');
    expect(rules.item(0).cssRules.item(0).selectorText).to.equal('&:hover *');
    expect(rules.item(0).cssRules.item(0).style.background).to.equal('blue');
    expect(rules.item(1).selectorText.startsWith('#wrap')).to.true;
    expect((rules.item(2) as any).name).to.equal('slideIn');
  });
  it('styleMap/classMap/exportPartsMap', () => {
    expect(styleMap({ '--x': '1px', fontSize: '14px', content: `'*'` })).to.equal(
      `;--x:1px;font-size:14px;content:'*';`,
    );
    expect(classMap({ foo: true, content: false })).to.equal(` foo `);
    expect(exportPartsMap({ foo: 'bar', content: 'content', false: false })).to.equal(`,foo:bar,content,`);
    expect(exportPartsMap({ foo: 'bar', content: true })).to.equal(`,foo:bar,content,`);
  });
  // it('createCSSAnimation', () => {
  //   expect(createCSSAnimation([{ opacity: 0 }])).to.equal('100%{;opacity:0;}');
  //   expect(createCSSAnimation([{ opacity: 1 }, { opacity: 0 }])).to.equal('0%{;opacity:1;}100%{;opacity:0;}');
  //   expect(createCSSAnimation([{ opacity: 1 }, { opacity: 0.1, offset: 0.7 }, { opacity: 0 }])).to.equal(
  //     '0%{;opacity:1;}70%{;opacity:0.1;}100%{;opacity:0;}',
  //   );
  //   expect(createCSSAnimation({ opacity: [0] })).to.equal('100%{;opacity:0;}');
  //   expect(createCSSAnimation({ opacity: [1, 0] })).to.equal('0%{;opacity:1;}100%{;opacity:0;}');
  //   expect(createCSSAnimation({ opacity: [1, 0], offset: [0, 0.7] })).to.equal(
  //     '0%{;opacity:1;}70%{;opacity:0;}100%{;}',
  //   );
  //   expect(createCSSAnimation({ opacity: [1, 0], backgroundColor: ['red', 'yellow', 'green'] })).to.equal(
  //     '0%{;opacity:1;background-color:red;}100%{;opacity:0;background-color:green;}50%{;background-color:yellow;}',
  //   );
  //   expect(
  //     createCSSAnimation({
  //       opacity: [1, 0],
  //       backgroundColor: ['red', 'yellow', 'green'],
  //       offset: [0, 0.7],
  //     }),
  //   ).to.equal(
  //     '0%{;opacity:1;background-color:red;}70%{;opacity:0;background-color:yellow;}100%{;background-color:green;}',
  //   );
  // });
});
