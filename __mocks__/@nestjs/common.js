// Stub de @nestjs/common para tests unitarios.
// Los decoradores de NestJS son no-ops en tests — no hay contenedor DI corriendo.
const noop = () => () => {};

module.exports = {
  Injectable: noop,
  Module: noop,
  Controller: noop,
  Get: noop,
  Post: noop,
  Put: noop,
  Delete: noop,
  Patch: noop,
  Param: noop,
  Body: noop,
  Query: noop,
  Global: noop,
  Catch: noop,
  UseFilters: noop,
  UseInterceptors: noop,
  UseGuards: noop,
  HttpStatus: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
  Logger: class {
    log() {}
    error() {}
    warn() {}
    debug() {}
  },
};
