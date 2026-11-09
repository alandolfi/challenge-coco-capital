import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'cocos',
  username: process.env.DB_USER ?? 'cocos',
  password: process.env.DB_PASSWORD ?? 'cocos',
  synchronize: false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/shared/infrastructure/persistence/typeorm/migrations/*.ts'],
});
