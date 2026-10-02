/**
 * Utility for generating and parsing property URLs in the format:
 * /properties/{slug}-{propertyPublicId}
 */

export {
  generatePropertySlug,
  buildPropertyPath as buildPropertyUrl,
  parsePropertyPublicId,
  isUUID,
} from "./seo/core";
