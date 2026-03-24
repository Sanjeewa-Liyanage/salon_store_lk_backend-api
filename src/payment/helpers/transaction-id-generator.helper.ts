import { v4 as uuidv4 } from 'uuid';

export function generateTransactionId(prefix = 'TXN'): string {
  const timestamp = Date.now(); // milliseconds
  const uuid = uuidv4().split('-')[0]; // shorter segment

  return `${prefix}-${timestamp}-${uuid}`;
}