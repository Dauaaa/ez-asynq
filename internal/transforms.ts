import { Fetcher } from "./common";

/**
 * Converts an array returned by a fetcher function into a Map where the keys are the values
 * of a specified property of the array objects.
 *
 * @param fetcher - A function that fetches an array of objects.
 * @param key - The name of the property to be used as the keys in the returned Map.
 * @returns A function that takes the same arguments as fetcher and returns a Promise
 * that resolves to a Map with the key property values as keys and the corresponding array objects as values.
 *
 * @example
 * ```
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * const fetchUsers: Fetcher<User[]> = async () => {
 *   const response = await fetch('/users');
 *   const data = await response.json();
 *   return data;
 * };
 *
 * const usersByIdFetcher = arrayToMapFetcher({
 *   fetcher: fetchUsers,
 *   key: 'id',
 * });
 *
 * // Now you can use the `usersByIdFetcher` function to fetch users and convert the array
 * // to a Map with the `id` property as the keys.
 * const user1 = await usersByIdFetcher(1); // Returns the user with id=1
 * const user2 = await usersByIdFetcher(2); // Returns the user with id=2
 *
 * console.log(user1 instanceof User); // true
 * console.log(user2 instanceof User); // true
 *
 * console.log(user1.name); // Prints the name of the user with id=1
 * console.log(user2.name); // Prints the name of the user with id=2
 * ```
 */
export const arrayToMapFetcher =
  <
    F extends Fetcher<any[]>,
    T extends F extends Fetcher<(infer T)[]> ? T : never,
    K extends keyof T
  >({
    fetcher,
    key,
  }: {
    fetcher: F;
    key: K;
  }) =>
  async (...args: Parameters<typeof fetcher>) => {
    const value = await fetcher(...args);
    return new Map<T[K], T>(value.map((value) => [value[key], value]));
  };
