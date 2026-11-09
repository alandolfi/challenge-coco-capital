import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orders')
export class TypeOrmOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'instrumentid' })
  instrumentId: number;

  @Index()
  @Column({ name: 'userid' })
  userId: number;

  @Column()
  size: number;

  @Column({ type: 'decimal' })
  price: number;

  @Column()
  type: string;

  @Column()
  side: string;

  @Column()
  status: string;

  @Column()
  datetime: Date;
}
