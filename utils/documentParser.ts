export interface ParsedDocument {
  name: string;
  type: string;
  size: number;
  content: string;
  summary?: string;
  charCount: number;
  wordCount: number;
}

// Security Constraints
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max to prevent memory exhaustion
export const MAX_DOCUMENT_CHARS = 50000; // 50k chars max (~10,000 words)
export const MAX_FILENAME_LENGTH = 120;

/**
 * Sanitizes user-supplied string: strips control chars, HTML tags, and truncates length
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove ASCII control characters
    .replace(/<[^>]*>/g, '') // Strip HTML tags to prevent XSS
    .trim()
    .substring(0, maxLength);
}

/**
 * Safely extracts and parses text from uploaded files (text, markdown, pdf)
 */
export const extractTextFromFile = async (file: File): Promise<ParsedDocument> => {
  if (!file) {
    throw new Error('Fichier manquant.');
  }

  // 1. File Size Protection
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). La taille maximale autorisée est de 5 Mo.`);
  }

  const rawName = file.name || 'document.txt';
  const fileName = sanitizeString(rawName, MAX_FILENAME_LENGTH) || 'document.txt';
  const fileType = sanitizeString(file.type || 'text/plain', 50);
  const size = file.size;

  // 2. Text-based files (.txt, .md, .markdown, .csv, .json, .html, etc.)
  if (
    fileType.startsWith('text/') ||
    /\.(txt|md|markdown|csv|json|html|ts|js)$/i.test(fileName)
  ) {
    try {
      const rawText = await file.text();
      const safeText = rawText.substring(0, MAX_DOCUMENT_CHARS);
      return createParsedDocument(fileName, fileType, size, safeText);
    } catch (e: any) {
      throw new Error(`Impossible de lire le fichier texte : ${e.message || 'erreur de lecture'}`);
    }
  }

  // 3. PDF files: safe sandboxed parsing
  if (fileType === 'application/pdf' || /\.pdf$/i.test(fileName)) {
    try {
      const buffer = await file.arrayBuffer();
      // Cap buffer size to 5MB
      if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
        throw new Error('Buffer PDF trop volumineux.');
      }
      const text = extractTextFromPdfBuffer(buffer);
      if (text && text.trim().length > 30) {
        const safeText = text.substring(0, MAX_DOCUMENT_CHARS);
        return createParsedDocument(fileName, 'application/pdf', size, safeText);
      }
    } catch (err) {
      console.warn('PDF text extraction fallback:', err);
    }

    // Fallback for complex layout / scanned PDFs
    return createParsedDocument(
      fileName, 
      'application/pdf', 
      size, 
      `[Document PDF : ${fileName} - Taille : ${(size / 1024).toFixed(1)} Ko]\n(Pour les documents PDF scannés ou complexes, vous pouvez également copier-coller les extraits directement dans la zone de texte pour un apprentissage optimal.)`
    );
  }

  // 4. Fallback reader
  try {
    const rawText = await file.text();
    const safeText = rawText.substring(0, MAX_DOCUMENT_CHARS);
    return createParsedDocument(fileName, fileType, size, safeText);
  } catch (e) {
    throw new Error(`Format de document non supporté pour "${fileName}". Veuillez charger un fichier texte, markdown ou PDF.`);
  }
};

/**
 * Hardened lightweight PDF text extraction with ReDoS protection and loop bounds
 */
function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  // Enforce memory limit
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return '';
  }

  const bytes = new Uint8Array(buffer);
  const textDecoder = new TextDecoder('utf-8', { fatal: false });
  const rawString = textDecoder.decode(bytes);

  const textFragments: string[] = [];
  const MAX_FRAGMENTS = 3000;
  const MAX_BLOCK_ITERATIONS = 2000;

  // Search BT ... ET blocks safely with bounded iteration
  const btRegex = /BT[\s\S]*?ET/g;
  let btMatch: RegExpExecArray | null = null;
  let iterations = 0;

  while ((btMatch = btRegex.exec(rawString)) !== null && iterations < MAX_BLOCK_ITERATIONS) {
    iterations++;
    const block = btMatch[0];

    // Sub-loop for string literals (str) Tj
    const strRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let strMatch: RegExpExecArray | null = null;
    let subIterations = 0;

    while ((strMatch = strRegex.exec(block)) !== null && subIterations < 200) {
      subIterations++;
      const str = strMatch[1]
        .replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ');
      
      const clean = sanitizeString(str, 300);
      if (clean) {
        textFragments.push(clean);
        if (textFragments.length >= MAX_FRAGMENTS) break;
      }
    }

    if (textFragments.length >= MAX_FRAGMENTS) break;

    // Sub-loop for arrays [(str) 20 (str)] TJ
    const tjRegex = /\[([^\]]+)\]\s*TJ/g;
    let tjMatch: RegExpExecArray | null = null;
    let arrayIterations = 0;

    while ((tjMatch = tjRegex.exec(block)) !== null && arrayIterations < 100) {
      arrayIterations++;
      const arrayContent = tjMatch[1];
      const innerStrRegex = /\(([^)]+)\)/g;
      let innerMatch: RegExpExecArray | null = null;
      const wordsInArray: string[] = [];
      let innerCount = 0;

      while ((innerMatch = innerStrRegex.exec(arrayContent)) !== null && innerCount < 100) {
        innerCount++;
        const raw = innerMatch[1].replace(/\\([()\\])/g, '$1');
        const clean = sanitizeString(raw, 200);
        if (clean) wordsInArray.push(clean);
      }

      if (wordsInArray.length > 0) {
        textFragments.push(wordsInArray.join(' '));
        if (textFragments.length >= MAX_FRAGMENTS) break;
      }
    }

    if (textFragments.length >= MAX_FRAGMENTS) break;
  }

  const result = textFragments.join(' ').replace(/\s+/g, ' ').trim();
  return result.substring(0, MAX_DOCUMENT_CHARS);
}

export function createParsedDocument(name: string, type: string, size: number, content: string): ParsedDocument {
  const safeName = sanitizeString(name, MAX_FILENAME_LENGTH) || 'Document';
  const safeType = sanitizeString(type, 50) || 'text/plain';
  const safeContent = content.substring(0, MAX_DOCUMENT_CHARS);
  const words = safeContent.trim().split(/\s+/).filter(Boolean);

  return {
    name: safeName,
    type: safeType,
    size: Math.max(0, size),
    content: safeContent,
    charCount: safeContent.length,
    wordCount: words.length
  };
}
