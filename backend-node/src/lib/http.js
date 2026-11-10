export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (m) => new HttpError(400, m);
export const unauthorized = (m = 'Não autorizado') => new HttpError(401, m);
export const forbidden = (m = 'Proibido') => new HttpError(403, m);
export const notFound = (m = 'Não encontrado') => new HttpError(404, m);
export const conflict = (m) => new HttpError(409, m);

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
