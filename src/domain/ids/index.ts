/**
 * Barrel for the stable ID helpers (domain layer, pure TypeScript).
 */
export {
  createIdBodyFactory,
  isIdBody,
  ID_BODY_LENGTH,
  ID_BODY_PATTERN,
  newIdBody,
  timestampOfIdBody,
} from './ulid.js';
export type { IdFactoryDeps } from './ulid.js';

export {
  assertObjectIdOfKind,
  idKindOf,
  idTimestampOf,
  ID_KINDS,
  ID_PREFIX_VALUES,
  ID_PREFIXES,
  isObjectId,
  isObjectIdOfKind,
  isWellFormedObjectId,
  newObjectId,
  parseObjectId,
  toObjectId,
} from './object-id.js';
export type { IdKind, IdPrefix, ObjectId, ParsedObjectId } from './object-id.js';

export {
  attemptIdOfContentItemId,
  CONTENT_ITEM_ID_SEPARATOR,
  createContentItemIdFactory,
  isGeneratedContentItemId,
  newContentItemId,
} from './content-item-id.js';
export type { ContentItemIdDeps } from './content-item-id.js';
