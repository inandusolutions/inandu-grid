import { treeRowsToExpand } from './inandu-grid-tree';

interface Node { name: string; children?: Node[] }

describe('treeRowsToExpand', () => {
  const cavendish: Node = { name: 'Cavendish' };
  const banana: Node = { name: 'Banana', children: [cavendish] };
  const apple: Node = { name: 'Apple' };
  const fruit: Node = { name: 'Fruit', children: [apple, banana] };
  const veg: Node = { name: 'Veg', children: [] };
  const data = [fruit, veg];
  const childrenOf = (row: Node): readonly Node[] | undefined => row.children;
  const names = (set: Set<Node>): string[] => [...set].map(row => row.name).sort();

  it("'none' opens nothing", () => {
    expect(treeRowsToExpand(data, 'none', childrenOf).size).toBe(0);
  });

  it("'all' opens every node that has children, and no leaf or empty node", () => {
    expect(names(treeRowsToExpand(data, 'all', childrenOf))).toEqual(['Banana', 'Fruit']);
  });

  it('a number opens that many levels', () => {
    expect(names(treeRowsToExpand(data, 0, childrenOf))).toEqual([]);
    expect(names(treeRowsToExpand(data, 1, childrenOf))).toEqual(['Fruit']);
    expect(names(treeRowsToExpand(data, 2, childrenOf))).toEqual(['Banana', 'Fruit']);
    expect(names(treeRowsToExpand(data, 9, childrenOf))).toEqual(['Banana', 'Fruit']);
  });

  it('works on an empty tree', () => {
    expect(treeRowsToExpand<Node>([], 'all', childrenOf).size).toBe(0);
  });
});
