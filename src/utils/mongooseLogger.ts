import { Schema } from 'mongoose';
import { loggerService } from './logger';

/**
 * Mongoose plugin that adds logging to all database operations
 */
export function mongooseLogger(schema: Schema): void {
  // Log all save operations
  schema.pre('save', function(next) {
    const doc = this as any;
    loggerService.debug('Saving document', {
      collection: doc.collection?.name,
      documentId: doc._id,
      isNew: doc.isNew
    });
    next();
  });

  // Log all update operations
  ['updateOne', 'updateMany', 'findOneAndUpdate'].forEach(method => {
    schema.pre(method as any, function(next) {
      const query = this as any;
      loggerService.debug(`${method} operation`, {
        collection: query.model?.collection?.name,
        filter: query.getFilter?.(),
        update: query.getUpdate?.()
      });
      next();
    });
  });

  // Log all delete operations
  ['deleteOne', 'deleteMany', 'findOneAndDelete'].forEach(method => {
    schema.pre(method as any, function(next) {
      const query = this as any;
      loggerService.debug(`${method} operation`, {
        collection: query.model?.collection?.name,
        filter: query.getFilter?.()
      });
      next();
    });
  });

  // Log all find operations
  ['find', 'findOne'].forEach(method => {
    schema.pre(method as any, function(next) {
      const query = this as any;
      loggerService.debug(`${method} operation`, {
        collection: query.model?.collection?.name,
        filter: query.getFilter?.(),
        projection: query.projection
      });
      next();
    });
  });

  // Log errors
  schema.post('save', function(error: Error | null, doc: any, next: (err?: Error) => void) {
    if (error) {
      loggerService.error('Error saving document', {
        error,
        collection: doc.collection?.name,
        documentId: doc._id
      });
    }
    next(error || undefined);
  });

  ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'find', 'findOne'].forEach(method => {
    schema.post(method as any, function(error: Error | null, result: any, next: (err?: Error) => void) {
      if (error) {
        const query = this as any;
        loggerService.error(`Error in ${method} operation`, {
          error,
          collection: query.model?.collection?.name
        });
      }
      next(error || undefined);
    });
  });
} 