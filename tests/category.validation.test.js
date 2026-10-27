import test from 'node:test';
import assert from 'node:assert/strict';

import {
  categoryIdSchema,
  updateCategoryStatusSchema,
} from '../src/modules/categories/category.validation.js';

test('accepts documented camelCase categoryId and isActive names', () => {
  const categoryId = categoryIdSchema.parse({ categoryId: '123e4567-e89b-12d3-a456-426614174000' });
  const status = updateCategoryStatusSchema.parse({ isActive: false });

  assert.equal(categoryId.categoryId, '123e4567-e89b-12d3-a456-426614174000');
  assert.equal(status.isActive, false);
});
