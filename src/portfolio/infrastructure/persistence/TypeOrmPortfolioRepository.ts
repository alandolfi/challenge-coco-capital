import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ARS_INSTRUMENT_ID } from 'src/shared/domain/constants';
import { Portfolio } from 'src/portfolio/domain/Portfolio';
import { PortfolioRepository } from 'src/portfolio/domain/PortfolioRepository';
import { Position } from 'src/portfolio/domain/Position';

type PositionRow = {
  instrumentId: number;
  ticker: string;
  name: string;
  quantity: number;
  lastPrice: number;
  marketValue: number;
  dailyReturn: number;
};

@Injectable()
export class TypeOrmPortfolioRepository implements PortfolioRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async userExists(userId: number): Promise<boolean> {
    const rows = await this.dataSource.query(`SELECT 1 FROM users WHERE id = $1`, [userId]);
    return rows.length > 0;
  }

  async getByUserId(userId: number): Promise<Portfolio> {
    const rows = await this.dataSource.query(
      `SELECT
        p."instrumentId",
        i.ticker,
        i.name,
        CAST(p.quantity AS FLOAT)                                   AS quantity,
        CAST(md.close AS FLOAT)                                     AS "lastPrice",
        CAST(p.quantity * md.close AS FLOAT)                        AS "marketValue",
        CAST(
          ROUND(
            ((md.close - md.previousclose) / NULLIF(md.previousclose, 0)) * 100, 2
          ) AS FLOAT
        )                                                           AS "dailyReturn"
      FROM positions p
      JOIN instruments i ON i.id = p."instrumentId"
      LEFT JOIN LATERAL (
        SELECT close, previousclose
        FROM marketdata
        WHERE instrumentid = p."instrumentId"
        ORDER BY date DESC
        LIMIT 1
      ) md ON TRUE
      WHERE p."userId" = $1
        AND p.quantity > 0`,
      [userId],
    );

    const arsRow = rows.find((r: PositionRow) => r.instrumentId === ARS_INSTRUMENT_ID);
    const availableCash = arsRow?.quantity ?? 0;

    const positions = rows
      .filter((r: PositionRow) => r.instrumentId !== ARS_INSTRUMENT_ID)
      .map((r: PositionRow) =>
        Position.fromPrimitives({
          ...r,
          lastPrice: r.lastPrice ?? 0,
          marketValue: r.marketValue ?? 0,
          dailyReturn: r.dailyReturn ?? 0,
        }),
      );

    return new Portfolio(userId, availableCash, positions);
  }
}
