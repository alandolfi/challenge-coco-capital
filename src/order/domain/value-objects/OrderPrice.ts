import { InvalidArgument } from 'src/shared/domain/exceptions/InvalidArgument';

export class OrderPrice {
  constructor(readonly value: number) {
    if (!value || value <= 0) {
      throw new InvalidArgument('El precio debe ser mayor a 0');
    }
  }
}
