/////////////////////////////////////////////////////////////////////
//
// SquarifyLayout implementation.
//
// Copyright (c) 2019 Bjoern Hoehrmann <https://bjoern.hoehrmann.de>.
//
// This module is licensed under the same terms as the original code.
//
// Original code from <https://github.com/joshtynjala/flextreemap>:
//
// Copyright 2007-2010 Josh Tynjala
//
// Permission is hereby granted, free of charge, to any person
// obtaining a copy of this software and associated documentation
// files (the "Software"), to deal in the Software without
// restriction, including without limitation the rights to use, copy,
// modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
/////////////////////////////////////////////////////////////////////

export interface SquarifyLayoutWeighted {
  weight: number;
}

export interface SquarifyLayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SquarifyLayoutWeightedRect
  extends SquarifyLayoutWeighted,
    SquarifyLayoutRect {}

/**
 *
 */
export class SquarifyLayout {
  private _totalRemainingWeightSum: number = 0;
  private _itemsRemaining: number = 0;

  /**
   * Calculate layout.
   *
   * @param items Items to be sized and layed out.
   * @param bounds Boundaries in which to distribute `items`.
   */
  public squarify(
    items: SquarifyLayoutWeighted[],
    bounds: SquarifyLayoutRect
  ) {
    const sorted = [...items].sort((a, b) => b.weight - a.weight);
    let rootbounds = bounds;
    this._totalRemainingWeightSum = this.sumWeights(sorted);
    this._itemsRemaining = sorted.length;
    let lastAspectRatio = Number.POSITIVE_INFINITY;
    let lengthOfShorterEdge = Math.min(
      rootbounds.width,
      rootbounds.height
    );
    let row: SquarifyLayoutWeightedRect[] = [];

    while (sorted.length > 0) {
      const nextItem = sorted.shift();
      row.push(nextItem as SquarifyLayoutWeightedRect);
      let drawRow = true;
      const aspectRatio = this.calculateWorstAspectRatioInRow(
        row,
        lengthOfShorterEdge,
        rootbounds
      );
      if (lastAspectRatio >= aspectRatio || isNaN(aspectRatio)) {
        lastAspectRatio = aspectRatio;

        // if this is the last item, force the row to draw
        drawRow = sorted.length == 0;
      } else {
        // put the item back if the aspect ratio is worse than the
        // previous one we want to draw, of course
        sorted.unshift(row.pop() as SquarifyLayoutWeightedRect);
      }

      if (drawRow) {
        rootbounds = this.layoutRow(
          row,
          lengthOfShorterEdge,
          rootbounds
        );

        // reset for the next pass
        lastAspectRatio = Number.POSITIVE_INFINITY;
        lengthOfShorterEdge = Math.min(
          rootbounds.width,
          rootbounds.height
        );
        row = [];
        drawRow = false;
      }
    }
  }

  protected calculateWorstAspectRatioInRow(
    row: SquarifyLayoutWeightedRect[],
    lengthOfShorterEdge: number,
    bounds: SquarifyLayoutRect
  ) {
    if (row.length == 0) {
      throw new Error(
        `Row must contain at least one item. If you see this message,
        please file a bug report.`
      );
    }

    if (lengthOfShorterEdge == 0) {
      return Number.MAX_VALUE;
    }

    const totalArea = bounds.width * bounds.height;
    const lengthSquared = lengthOfShorterEdge * lengthOfShorterEdge;

    // special case where there is zero weight (to avoid divide by
    // zero problems)
    if (this._totalRemainingWeightSum == 0) {
      const oneItemArea = totalArea * (1 / this._itemsRemaining);
      const rowAreaSquared = Math.pow(oneItemArea * row.length, 2);
      return Math.max(
        (lengthSquared * oneItemArea) / rowAreaSquared,
        rowAreaSquared / (lengthSquared * oneItemArea)
      );
    }

    const firstItem = row[0];
    const firstItemArea =
      totalArea * (firstItem.weight / this._totalRemainingWeightSum);
    let maxArea = firstItemArea;
    let minArea = firstItemArea;
    let sumOfAreas = firstItemArea;
    const rowCount = row.length;
    for (let i = 1; i < rowCount; i++) {
      const item = row[i];
      const area =
        totalArea * (item.weight / this._totalRemainingWeightSum);
      minArea = Math.min(area, minArea);
      maxArea = Math.max(area, maxArea);
      sumOfAreas += area;
    }

    // max(w^2 * r+ / s^2, s^2 / (w^2 / r-))
    const sumSquared = sumOfAreas * sumOfAreas;
    return Math.max(
      (lengthSquared * maxArea) / sumSquared,
      sumSquared / (lengthSquared * minArea)
    );
  }

  protected layoutRow(
    row: SquarifyLayoutWeightedRect[],
    lengthOfShorterEdge: number,
    bounds: SquarifyLayoutRect
  ) {
    const horizontal = lengthOfShorterEdge == bounds.width;
    const lengthOfLongerEdge = horizontal
      ? bounds.height
      : bounds.width;
    const sumOfRowWeights = this.sumWeights(row);

    let lengthOfCommonItemEdge =
      lengthOfLongerEdge *
      (sumOfRowWeights / this._totalRemainingWeightSum);
    if (isNaN(lengthOfCommonItemEdge)) {
      if (this._totalRemainingWeightSum == 0) {
        lengthOfCommonItemEdge =
          (lengthOfLongerEdge * row.length) / this._itemsRemaining;
      } else {
        lengthOfCommonItemEdge = 0;
      }
    }

    const rowCount = row.length;
    let position = 0;
    for (let i = 0; i < rowCount; i++) {
      const item = row[i];
      const weight = item.weight;

      let ratio = weight / sumOfRowWeights;
      // if all nodes in a row have a weight of zero, give them the
      // same area
      if (isNaN(ratio)) {
        if (sumOfRowWeights == 0 || isNaN(sumOfRowWeights)) {
          ratio = 1 / row.length;
        } else {
          ratio = 0;
        }
      }

      const lengthOfItemEdge = lengthOfShorterEdge * ratio;

      if (horizontal) {
        item.x = bounds.x + position;
        item.y = bounds.y;
        item.width = lengthOfItemEdge;
        item.height = lengthOfCommonItemEdge;
      } else {
        item.x = bounds.x;
        item.y = bounds.y + position;
        item.width = Math.max(0, lengthOfCommonItemEdge);
        item.height = Math.max(0, lengthOfItemEdge);
      }
      position += lengthOfItemEdge;
      this._itemsRemaining--;
    }

    this._totalRemainingWeightSum -= sumOfRowWeights;
    return this.updateBoundsForNextRow(
      bounds,
      lengthOfCommonItemEdge
    );
  }

  protected updateBoundsForNextRow(
    bounds: SquarifyLayoutRect,
    modifier: number
  ) {
    if (bounds.width > bounds.height) {
      const newWidth = Math.max(0, bounds.width - modifier);
      bounds.x -= newWidth - bounds.width;
      bounds.width = newWidth;
    } else {
      const newHeight = Math.max(0, bounds.height - modifier);
      bounds.y -= newHeight - bounds.height;
      bounds.height = newHeight;
    }

    return bounds;
  }

  protected sumWeights(source: any[] | SquarifyLayoutWeightedRect[]) {
    let sum = 0;
    for (const item of source) {
      sum += item.weight;
    }
    return sum;
  }
}
