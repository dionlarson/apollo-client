import { DocumentNode, FieldNode } from 'graphql';

import {
  Reference,
  StoreObject,
  StoreValue,
  isReference,
} from '../../../utilities';

import { StorageType } from '../../inmemory/policies';

// The Readonly<T> type only really works for object types, since it marks
// all of the object's properties as readonly, but there are many cases when
// a generic type parameter like TExisting might be a string or some other
// primitive type, in which case we need to avoid wrapping it with Readonly.
// SafeReadonly<string> collapses to just string, which makes string
// assignable to SafeReadonly<any>, whereas string is not assignable to
// Readonly<any>, somewhat surprisingly.
export type SafeReadonly<T> = T extends object ? Readonly<T> : T;

export type MissingTree = string | {
  readonly [key: string]: MissingTree;
};

export class MissingFieldError extends Error {
  constructor(
    public readonly message: string,
    public readonly path: MissingTree | Array<string | number>,
    public readonly query: DocumentNode,
    public readonly variables?: Record<string, any>,
  ) {
    // 'Error' breaks prototype chain here
    super(message);

    if (Array.isArray(this.path)) {
      this.missing = this.message;
      for (let i = this.path.length - 1; i >= 0; --i) {
        this.missing = { [this.path[i]]: this.missing };
      }
    } else {
      this.missing = this.path;
    }

    // We're not using `Object.setPrototypeOf` here as it isn't fully supported
    // on Android (see issue #3236).
    (this as any).__proto__ = MissingFieldError.prototype;
  }

  public readonly missing: MissingTree;
}

export interface FieldSpecifier {
  typename?: string;
  fieldName: string;
  field?: FieldNode;
  args?: Record<string, any>;
  variables?: Record<string, any>;
}

export interface ReadFieldOptions extends FieldSpecifier {
  from?: StoreObject | Reference;
  fallbackToIncoming?: boolean;
}

export interface ReadFieldFunction {
  <V = StoreValue>(options: ReadFieldOptions): SafeReadonly<V> | undefined;
  <V = StoreValue>(
    fieldName: string,
    from?: StoreObject | Reference,
  ): SafeReadonly<V> | undefined;
}

export type ToReferenceFunction = (
  objOrIdOrRef: StoreObject | string | Reference,
  mergeIntoStore?: boolean,
) => Reference | undefined;

export type CanReadFunction = (value: StoreValue) => boolean;

export type ModifierDetails = {
  DELETE: any;
  INVALIDATE: any;
  fieldName: string;
  storeFieldName: string;
  readField: ReadFieldFunction;
  canRead: CanReadFunction;
  isReference: typeof isReference;
  toReference: ToReferenceFunction;
  storage: StorageType;
}

export type Modifier<T> = (value: T, details: ModifierDetails) => T;

export type Modifiers = {
  [fieldName: string]: Modifier<any>;
};
