import { makeSqlService } from './sqllike.js';

const svc = makeSqlService('mysql');

export const provision = svc.provision;
export const createUser = svc.createUser;
export const deleteUser = svc.deleteUser;
export const destroy = svc.destroy;
