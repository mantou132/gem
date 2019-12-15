import { expect } from '@open-wc/testing';
import { Pool, Storage, QueryString, css, raw, createCSSSheet, styled } from '..';

describe('utils 测试', () => {
  it('Pool', () => {
    const pool = new Pool<Function>();
    let countAtStart = 0;
    let countAtPause = 0;
    pool.addEventListener('start', () => (countAtStart = pool.count));
    pool.addEventListener('end', () => (countAtPause = pool.count));
    const fun1 = () => ({});
    const fun2 = () => ({});
    pool.add(fun1);
    pool.add(fun2);
    expect(pool.get()).to.equal(fun1);
    expect(pool.get()).to.equal(fun2);
    expect(countAtStart).to.equal(0);
    expect(countAtPause).to.equal(2);
    expect(pool.pool.size).to.equal(0);
    expect(pool.get()).to.equal(undefined);
  });
  it('Storage', () => {
    const storage = new Storage();
    storage.setLocal('local', { a: 1 });
    expect(localStorage.getItem('local')).to.equal('{"a":1}');
    expect(storage.getLocal('local')).to.deep.equal({ a: 1 });
    storage.setSession('session', { a: 1 });
    expect(storage.getSession('session')).to.deep.equal({ a: 1 });
    expect(new Storage().getSession('session')).to.deep.equal({ a: 1 });
    sessionStorage.setItem('invalid_json', 'invalid');
    expect(storage.getSession('invalid_json')).to.equal(undefined);
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
    const rules = cssSheet.cssRules as unknown;
    const sheet = rules as CSSRuleList;
    expect(sheet.item(0).selectorText).to.equal('body');
    expect(sheet.item(0).style.background).to.equal('red');
  });
  it('raw/css', () => {
    expect(raw`<div>${'str'}</div>`).to.equal('<div>str</div>');
  });
  it('styled', () => {
    const styles = createCSSSheet({
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
    expect(styles.scroll.startsWith('scroll')).to.true;
    const temp = styles as unknown;
    const cssSheet = temp as CSSStyleSheet;
    expect(cssSheet.cssRules.item(0).selectorText.startsWith('.scroll')).to.true;
    expect(cssSheet.cssRules.item(0).style.background.startsWith('red')).to.true;
    expect(/\.scroll(-|\w)+:hover \*/.test(cssSheet.cssRules.item(1).selectorText)).to.true;
    expect(cssSheet.cssRules.item(1).style.background.startsWith('blue')).to.true;
    expect(cssSheet.cssRules.item(2).selectorText.startsWith('#wrap')).to.true;
    expect(cssSheet.cssRules.item(3).selectorText).to.equal('div');
  });
});
