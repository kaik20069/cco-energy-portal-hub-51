
/**
 * Remove caracteres especiais e espaços de nomes de arquivos
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w.-]/g, '_') // Substitui caracteres não alfanuméricos por underscores
    .toLowerCase();
};

/**
 * Gera um caminho de arquivo padronizado para o storage
 */
export const generateStoragePath = (
  folder: string, 
  fileName: string, 
  userId: string,
  referenceMonth: string
): string => {
  const sanitizedFileName = sanitizeFileName(fileName);
  const [month, year] = referenceMonth.split('/');
  
  // Obter apenas o nome do arquivo sem extensão
  const fileNameWithoutExt = sanitizedFileName.split('.')[0];
  // Obter a extensão do arquivo
  const fileExt = sanitizedFileName.split('.').pop();
  
  // Gerar um caminho padronizado
  return `${folder}/${year}/${month}/${userId}_${fileNameWithoutExt}.${fileExt}`;
};
