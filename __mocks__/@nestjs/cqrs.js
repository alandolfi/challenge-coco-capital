// Stub de @nestjs/cqrs para tests unitarios.
// Los decoradores y buses son no-ops — en tests se instancia el handler directamente.
const noop = () => () => {};

module.exports = {
  CommandHandler: noop,
  QueryHandler: noop,
  EventsHandler: noop,
  CommandBus: class {},
  QueryBus: class {},
  EventBus: class {},
  CqrsModule: class {},
};
