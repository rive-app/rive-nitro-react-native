export const downloadFileAsArrayBuffer = async (
  url: string
): Promise<ArrayBuffer | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch file: ${response.statusText}`);
      return null;
    }
    const blob = await response.blob();
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    return arrayBuffer;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
};
