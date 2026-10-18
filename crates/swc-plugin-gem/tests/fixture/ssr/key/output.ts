// @ts-nocheck
import { createDecoratorTheme, createScopedTheme, createStore, createTheme } from '@mantou/gem';
export const store = createStore({
    a: 1
}, "6baf50301989d347_store");
const other = 1, store2 = createStore({
    b: 1
}, "6baf50301989d347_store2");
const keyed = createStore({
    c: 1
}, 'custom');
const aliased = gem.createStore({
    d: 1
});
function create() {
    const local = createStore({
        e: 1
    });
    return local;
}
export const theme = createTheme({
    color: 'red'
}, "6baf50301989d347_theme");
const scopedTheme = createScopedTheme({
    color: 'red'
}, "6baf50301989d347_scopedTheme");
const elementTheme = createDecoratorTheme({
    color: 'red'
}, "6baf50301989d347_elementTheme");
const keyedTheme = createTheme({
    color: 'red'
}, 'custom');
