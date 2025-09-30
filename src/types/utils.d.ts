/**
 * ExplicitFields removes fields like [key: string] from a type.
 */
type ExplicitFields<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

/**
 * DeepPartial makes all fields from the type T optional.
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
