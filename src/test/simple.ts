import {
  SquarifyLayout,
  SquarifyLayoutWeightedRect,
} from '../squarify';

const items = [{ weight: 3 }, { weight: 2 }, { weight: 1 }];

const sq = new SquarifyLayout();
sq.squarify(items, {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
});

console.log(items[1] as SquarifyLayoutWeightedRect);
