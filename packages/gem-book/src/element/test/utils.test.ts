import { expect } from '@open-wc/testing';

import { capitalize, flatNav } from '../lib/utils';
import { getUserLink } from '../../common/utils';

describe('lib/utils', () => {
  it('capitalize', () => {
    expect(capitalize('abc')).to.equal('Abc');
    expect(capitalize('abc d')).to.equal('Abc d');
  });
  it('flatNav', () => {
    expect(
      flatNav([
        { title: 'title', link: '/', type: 'dir', children: [{ title: 'home', link: '/' }] },
        { title: 'about', link: '/about' },
      ]),
    ).to.deep.equal([
      { title: 'home', link: '/' },
      { title: 'about', link: '/about' },
    ]);
  });
  it('getUserLink', () => {
    expect(getUserLink('/README.md')).to.equal('/');
    expect(getUserLink('/index.md')).to.equal('/');
    expect(getUserLink('/001-README.md')).to.equal('/README');
    expect(getUserLink('/guide/README.md')).to.equal('/guide/');
    expect(getUserLink('/001-guide/README.md')).to.equal('/guide/');
    expect(getUserLink('/001-guide/README.md', true)).to.equal('/001-guide/');
  });
});
