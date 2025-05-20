type ArtboardByTypes = 'index' | 'name';
export interface ArtboardBy {
  type: ArtboardByTypes;
  index?: number;
  name?: string;
}

/**
 * Creates an ArtboardBy object for the artboard at the given index.
 * @param {number} index - The index of the artboard to create an ArtboardBy object for.
 * @returns {ArtboardBy} An ArtboardBy object for the artboard at the given index.
 */
export const ArtboardByIndex = (index: number): ArtboardBy => {
  if (!Number.isInteger(index)) {
    throw new Error('Artboard index must be an integer');
  }
  return {
    type: 'index',
    index: index,
  };
};

/**
 * Creates an ArtboardBy object for the artboard with the given name.
 * @param {string} name - The name of the artboard to create an ArtboardBy object for.
 * @returns {ArtboardBy} An ArtboardBy object for the artboard with the given name.
 */
export const ArtboardByName = (name: string): ArtboardBy => ({
  type: 'name',
  name: name,
});
