import { Exception } from './Exception';

export class NotFound extends Exception {
  constructor(entity: string, id: number | string) {
    super(`${entity} con id ${id} no existe`);
    this.name = this.constructor.name;
  }
}
