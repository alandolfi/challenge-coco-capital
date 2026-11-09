import { TypeOrmModule } from '@nestjs/typeorm';

export class PostgresTypeormClient {
  static create() {
    return TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      database: process.env.DB_NAME ?? 'cocos',
      username: process.env.DB_USER ?? 'cocos',
      password: process.env.DB_PASSWORD ?? 'cocos',
      synchronize: false,
      autoLoadEntities: true,
      migrations: ['dist/shared/infrastructure/persistence/typeorm/migrations/*.js'],
      migrationsRun: true,
    });
  }
}
