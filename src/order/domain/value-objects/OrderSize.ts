import { InvalidArgument } from 'src/shared/domain/exceptions/InvalidArgument';

export class OrderSize {
  constructor(readonly value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new InvalidArgument('La cantidad debe ser un entero mayor a 0');
    }
  }
}
