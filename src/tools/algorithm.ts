export function findLastIndex<E>(collection: any, pred: (e: E) => boolean): number | undefined
{
    for (let i = collection.length - 1; i >= 0; i--)
    {
        if (pred(collection[i]) === true) {
            return i;
        }
    }
    return undefined;
}