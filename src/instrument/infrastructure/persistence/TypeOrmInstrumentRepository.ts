import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Instrument } from 'src/instrument/domain/Instrument';
import { InstrumentRepository } from 'src/instrument/domain/InstrumentRepository';

@Injectable()
export class TypeOrmInstrumentRepository implements InstrumentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async search(query: string): Promise<Instrument[]> {
    const rows = await this.dataSource.query(
      `SELECT
        i.id,
        i.ticker,
        i.name,
        i.type,
        CAST(md.close AS FLOAT)         AS "lastPrice",
        CAST(
          ROUND(
            ((md.close - md.previousclose) / NULLIF(md.previousclose, 0)) * 100, 2
          ) AS FLOAT
        )                               AS "dailyReturn"
      FROM instruments i
      LEFT JOIN LATERAL (
        SELECT close, previousclose
        FROM marketdata
        WHERE instrumentid = i.id
        ORDER BY date DESC
        LIMIT 1
      ) md ON TRUE
      WHERE ($1 = '' OR i.ticker ILIKE $1 OR i.name ILIKE $1)
      ORDER BY i.ticker`,
      [query ? `%${query}%` : ''],
    );

    return rows.map((r: any) =>
      Instrument.fromPrimitives({
        id: r.id,
        ticker: r.ticker,
        name: r.name,
        type: r.type,
        lastPrice: r.lastPrice ?? null,
        dailyReturn: r.dailyReturn ?? null,
      }),
    );
  }
}
