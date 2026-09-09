const STOCK_LENGTH_MM = 6_000;
const SCALE = 1_000;
const MAX_SEARCH_NODES = 100_000;

export type CutRequest = {
  dimensionId: number;
  length: number;
  quantity: number;
};

export type CutPiece = {
  dimensionId: number;
  length: number;
  lengthMm: number;
};

export type RailPlan = {
  railNumber: number;
  pieces: Array<{ dimensionId: number; length: number }>;
  used: number;
  waste: number;
  reusableOffcut: number;
};

export type CutPlan = {
  stockLength: 6;
  totalRequested: number;
  railCount: number;
  totalWaste: number;
  totalReusableOffcut: number;
  rails: RailPlan[];
};

type WorkingRail = {
  remainingMm: number;
  pieces: CutPiece[];
};

export interface CutPlanStrategy {
  calculate(pieces: CutPiece[]): WorkingRail[];
}

/**
 * Best-fit decreasing gives a fast upper bound. The exact search then tries
 * to fit the same pieces into the smallest possible number of rails.
 */
export class MinimumRailCutStrategy implements CutPlanStrategy {
  calculate(pieces: CutPiece[]): WorkingRail[] {
    const ordered = [...pieces].sort((a, b) => b.lengthMm - a.lengthMm);
    const fallback = this.bestFitDecreasing(ordered);
    const lowerBound = Math.ceil(
      ordered.reduce((total, piece) => total + piece.lengthMm, 0) /
        STOCK_LENGTH_MM,
    );

    let best = fallback;
    let nodesVisited = 0;

    for (let railCount = lowerBound; railCount < fallback.length; railCount += 1) {
      const candidate = this.searchExact(ordered, railCount, () => {
        nodesVisited += 1;
        return nodesVisited <= MAX_SEARCH_NODES;
      });

      if (!candidate) {
        break;
      }

      best = candidate;
      break;
    }

    return best;
  }

  private bestFitDecreasing(pieces: CutPiece[]): WorkingRail[] {
    const rails: WorkingRail[] = [];

    for (const piece of pieces) {
      let targetIndex = -1;
      let smallestRemaining = Number.POSITIVE_INFINITY;

      rails.forEach((rail, index) => {
        if (
          rail.remainingMm >= piece.lengthMm &&
          rail.remainingMm - piece.lengthMm < smallestRemaining
        ) {
          targetIndex = index;
          smallestRemaining = rail.remainingMm - piece.lengthMm;
        }
      });

      if (targetIndex === -1) {
        rails.push({
          remainingMm: STOCK_LENGTH_MM - piece.lengthMm,
          pieces: [piece],
        });
      } else {
        const rail = rails[targetIndex];
        rail.remainingMm -= piece.lengthMm;
        rail.pieces.push(piece);
      }
    }

    return rails;
  }

  private searchExact(
    pieces: CutPiece[],
    railCount: number,
    canContinue: () => boolean,
  ): WorkingRail[] | null {
    const rails: WorkingRail[] = Array.from({ length: railCount }, () => ({
      remainingMm: STOCK_LENGTH_MM,
      pieces: [],
    }));

    const place = (pieceIndex: number): WorkingRail[] | null => {
      if (!canContinue()) {
        return null;
      }
      if (pieceIndex === pieces.length) {
        return rails.every((rail) => rail.pieces.length > 0) ? rails : null;
      }

      const piece = pieces[pieceIndex];
      const triedRemaining = new Set<number>();

      for (const rail of rails) {
        if (
          rail.remainingMm < piece.lengthMm ||
          triedRemaining.has(rail.remainingMm)
        ) {
          continue;
        }

        triedRemaining.add(rail.remainingMm);
        rail.remainingMm -= piece.lengthMm;
        rail.pieces.push(piece);

        const result = place(pieceIndex + 1);
        if (result) {
          return result;
        }

        rail.pieces.pop();
        rail.remainingMm += piece.lengthMm;
      }

      return null;
    };

    return place(0);
  }
}

export class CutPlanOptimizer {
  constructor(
    private readonly strategy: CutPlanStrategy = new MinimumRailCutStrategy(),
  ) {}

  calculate(requests: CutRequest[], reusableLengths: number[] = []): CutPlan {
    const pieces = requests.flatMap((request) =>
      Array.from({ length: request.quantity }, () => {
        const lengthMm = Math.round(request.length * SCALE);
        return { ...request, lengthMm };
      }),
    );

    if (pieces.some((piece) => piece.lengthMm <= 0 || piece.lengthMm > STOCK_LENGTH_MM)) {
      throw new Error("Every requested cut must be between 0 and 6 meters");
    }

    const rails = this.strategy.calculate(pieces);
    const totalRequestedMm = pieces.reduce(
      (total, piece) => total + piece.lengthMm,
      0,
    );
    const reusableLengthMm = reusableLengths
      .map((length) => Math.round(length * SCALE))
      .filter((length) => length > 0 && length <= STOCK_LENGTH_MM);
    const classifiedRails = rails.map((rail) => {
      const remainingMm = rail.remainingMm;
      const isReusable = reusableLengthMm.some(
        (length) => length <= remainingMm,
      );

      return {
        ...rail,
        wasteMm: isReusable ? 0 : remainingMm,
        reusableOffcutMm: isReusable ? remainingMm : 0,
      };
    });

    return {
      stockLength: 6,
      totalRequested: this.toMeters(totalRequestedMm),
      railCount: rails.length,
      totalWaste: this.toMeters(
        classifiedRails.reduce((total, rail) => total + rail.wasteMm, 0),
      ),
      totalReusableOffcut: this.toMeters(
        classifiedRails.reduce(
          (total, rail) => total + rail.reusableOffcutMm,
          0,
        ),
      ),
      rails: classifiedRails.map((rail, index) => ({
        railNumber: index + 1,
        pieces: rail.pieces.map((piece) => ({
          dimensionId: piece.dimensionId,
          length: this.toMeters(piece.lengthMm),
        })),
        used: this.toMeters(STOCK_LENGTH_MM - rail.remainingMm),
        waste: this.toMeters(rail.wasteMm),
        reusableOffcut: this.toMeters(rail.reusableOffcutMm),
      })),
    };
  }

  private toMeters(valueMm: number): number {
    return Number((valueMm / SCALE).toFixed(3));
  }
}