import bcrypt from 'bcryptjs';

export const hash = (plain) => bcrypt.hash(plain, 10);
export const compare = (plain, h) => bcrypt.compare(plain, h);
