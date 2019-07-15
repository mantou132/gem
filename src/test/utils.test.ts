import { expect } from '@open-wc/testing';
import { Pool, Storage, QueryString, css, createCSSSheet, styled } from '..';

describe('utils 测试', () => {
  it('Pool', () => {
    const pool = new Pool<Function>();
    const fun1 = () => {};
    const fun2 = () => {};
    pool.add(fun1);
    pool.add(fun2);
    expect(pool.get()).to.equal(fun1);
    expect(pool.get()).to.equal(fun2);
  });
  it('Storage', () => {
    const storage = new Storage();
    storage.setSession('session', { a: 1 });
    expect(storage.getSession('session')).to.deep.equal({ a: 1 });
  });
  it('QueryString', () => {
    const query = new QueryString('a=1&b=2');
    expect(query.toString()).to.equal('?a=1&b=2');
    expect(query.get('a')).to.equal('1');
    query.concat('c=3');
    expect(query.get('c')).to.equal('3');
    query.concat({ d: 4 });
    expect(query.toString()).to.equal('?a=1&b=2&c=3&d=4');
  });
  it('createCSSSheet', () => {
    const cssSheet = createCSSSheet(css`
      body {
        background: red;
      }
    `);
    expect(cssSheet.cssRules.item(0).selectorText).to.equal('body');
    expect(cssSheet.cssRules.item(0).style.background).to.equal('red');
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
    });
    expect(styles.scroll).to.equal('scroll');
    let temp = styles as unknown;
    let cssSheet = temp as CSSStyleSheet;
    expect(cssSheet.cssRules.item(0).selectorText).to.equal('.scroll');
    expect(cssSheet.cssRules.item(0).style.background).to.equal('red');
    expect(cssSheet.cssRules.item(1).selectorText).to.equal('.scroll:hover *');
    expect(cssSheet.cssRules.item(1).style.background).to.equal('blue');
    expect(cssSheet.cssRules.item(2).selectorText).to.equal('#wrap');
  });
});
