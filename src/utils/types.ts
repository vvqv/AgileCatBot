export type PropertiesTypes<T> = T extends Record<string, infer U> ? U : never;
